// Everything the app asks the database for, in one place.
// Shapes are converted to the app's own types (src/data/fakeHousehold.ts) here.

import { findCatalogMatch } from '@/data/fakeCatalog';
import {
  defaultSettings,
  PHONE_PREFIX,
  type DialectKey,
  type HouseholdSettings,
  type Item,
  type LanguageKey,
  type Member,
  type MemberRole,
  type StoreKey,
} from '@/data/fakeHousehold';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import type { ActiveTrip, Question, QuestionAnswer } from '@/store/tripTypes';

// Which of my lists was open last (each list = one household with its own people)
const CURRENT_KEY = 'sallitna.currentHousehold';
export const rememberHousehold = (id: string) => AsyncStorage.setItem(CURRENT_KEY, id).catch(() => {});
const rememberedHousehold = () => AsyncStorage.getItem(CURRENT_KEY).catch(() => null);

// "+201001234567" from "1001234567"
const e164 = (digits: string) => `${PHONE_PREFIX}${digits}`;

type MemberRow = {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string;
  gender: 'f' | 'm';
  role: MemberRole;
  view_language: LanguageKey;
  speaks: LanguageKey[];
  dialect: DialectKey;
  avatar_color: Member['avatar_color'];
  settings: Partial<HouseholdSettings> | null;
  joined_at: string;
  left_at: string | null;
};

const toMember = (row: MemberRow): Member => ({
  id: row.id,
  display_name: row.display_name,
  initial: row.display_name.trim().charAt(0),
  gender: row.gender,
  role: row.role,
  avatar_color: row.avatar_color,
  view_language: row.view_language,
  speaks: row.speaks,
  dialect: row.dialect,
  joined_at: row.joined_at,
  items_added: 0, // counted from item history in a later session
});

export type Membership = {
  householdId: string;
  householdName: string;
  meId: string;
  members: Member[]; // everyone still in the household
  formerMembers: Member[]; // removed/left — kept so old items still show who added them
  settings: HouseholdSettings;
};

// Throws the database's message so screens can show a friendly error
function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

// --- Sign-in --------------------------------------------------------------------------------

export async function sendCode(phoneDigits: string) {
  check(await supabase.auth.signInWithOtp({ phone: e164(phoneDigits) }));
}

export async function verifyCode(phoneDigits: string, code: string) {
  check(await supabase.auth.verifyOtp({ phone: e164(phoneDigits), token: code, type: 'sms' }));
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function isSignedIn() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

// The saved sign-in points to an account that no longer exists (e.g. deleted) → forget it on this phone.
// Returns true if it was cleared. Network problems don't count (we keep the sign-in and retry).
export async function clearStaleSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  const { error } = await supabase.auth.getUser();
  const gone = !!error && (error.status === 401 || error.status === 403 || error.status === 404);
  if (gone) await supabase.auth.signOut({ scope: 'local' });
  return gone;
}

// --- My household ------------------------------------------------------------------------------

// A face on a list card (enough for an avatar)
export type Face = Pick<Member, 'id' | 'display_name' | 'initial' | 'avatar_color'>;
export type ListSummary = { householdId: string; name: string; memberCount: number; members: Face[]; myRole: MemberRole };

// Everything about my lists in ONE request (the database is far away, so every round trip counts):
// all my lists with their people (for «قوايمي»), and the one to open — the one asked for, else the last one
// opened, else the newest. membership is null when I'm in no list yet.
export async function loadMyLists(householdId?: string): Promise<{ membership: Membership | null; lists: ListSummary[] }> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return { membership: null, lists: [] };

  const [rowsResult, remembered] = await Promise.all([
    supabase
      .from('members')
      .select('*, households(name, members(*))')
      .eq('user_id', uid)
      .is('left_at', null)
      .order('joined_at', { ascending: false }),
    householdId ? Promise.resolve(null) : rememberedHousehold(),
  ]);
  const mineAll = check(rowsResult) as (MemberRow & { households: { name: string; members: MemberRow[] } | null })[];
  const byJoined = (a: MemberRow, b: MemberRow) => a.joined_at.localeCompare(b.joined_at);

  const lists: ListSummary[] = mineAll.map((r) => {
    const current = (r.households?.members ?? []).filter((m) => !m.left_at).sort(byJoined);
    return {
      householdId: r.household_id,
      name: r.households?.name ?? '',
      memberCount: Math.max(1, current.length),
      members: current.map((m) => ({
        id: m.id,
        display_name: m.display_name,
        initial: m.display_name.trim().charAt(0),
        avatar_color: m.avatar_color,
      })),
      myRole: r.role,
    };
  });
  if (mineAll.length === 0) return { membership: null, lists };

  const wanted = householdId ?? remembered;
  const mine = mineAll.find((m) => m.household_id === wanted) ?? mineAll[0];
  rememberHousehold(mine.household_id);
  const rows = [...(mine.households?.members ?? [])].sort(byJoined);

  return {
    lists,
    membership: {
      householdId: mine.household_id,
      householdName: mine.households?.name ?? '',
      meId: mine.id,
      members: rows.filter((r) => !r.left_at).map(toMember),
      formerMembers: rows.filter((r) => r.left_at).map(toMember),
      settings: { ...defaultSettings, ...(mine.settings ?? {}) },
    },
  };
}

// Shortcuts for callers that need just one half
export const listMyHouseholds = async () => (await loadMyLists()).lists;
export const loadMembership = async (householdId?: string) => (await loadMyLists(householdId)).membership;

export type Profile = { displayName: string; gender: 'f' | 'm'; dialect: DialectKey; viewLanguage: LanguageKey };

// «عرّفنا عليك» answers, kept with the sign-in account until the first list is created
// (a member row needs a list, so they can't go there yet)
export async function saveSignupProfile(p: Profile) {
  const { error } = await supabase.auth.updateUser({ data: { profile: p } });
  if (error) throw new Error(error.message);
}

export async function getSignupProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  const saved = data.session?.user.user_metadata?.profile as Partial<Profile> | undefined;
  if (!saved?.displayName || !saved.gender) return null;
  return {
    displayName: saved.displayName,
    gender: saved.gender,
    dialect: saved.dialect ?? 'saudi',
    viewLanguage: saved.viewLanguage ?? 'ar',
  };
}

// Returns the new household's id
export async function createHousehold(householdName: string, p: Profile): Promise<string> {
  return check(
    await supabase.rpc('create_household', {
      household_name: householdName.trim(),
      display_name: p.displayName.trim(),
      gender: p.gender,
      dialect: p.dialect,
      view_language: p.viewLanguage,
    }),
  ) as string;
}

// --- Invites ---------------------------------------------------------------------------------------

export type InvitePreview = {
  householdName: string;
  inviterName: string | null;
  inviterGender: 'f' | 'm' | null;
  memberCount: number;
  faces: { initial: string; color: Member['avatar_color'] }[];
  expired: boolean;
  role: 'member' | 'helper'; // a helper code: the join steps speak the helper's language
};

// What the join screen shows. Works before signing in. null = no such code.
export async function getInvite(code: string): Promise<InvitePreview | null> {
  const rows = check(await supabase.rpc('get_invite', { invite_code: code })) as
    | {
        household_name: string;
        inviter_name: string | null;
        inviter_gender: 'f' | 'm' | null;
        member_count: number;
        members: { initial: string; color: Member['avatar_color'] }[];
        expired: boolean;
        role: 'member' | 'helper';
      }[]
    | null;
  const row = rows?.[0];
  if (!row) return null;
  return {
    householdName: row.household_name,
    inviterName: row.inviter_name,
    inviterGender: row.inviter_gender,
    memberCount: row.member_count,
    faces: row.members,
    expired: row.expired,
    role: row.role,
  };
}

// Reuse a still-valid invite I can see, or make a new one (a helper code joins people as helpers)
export async function getOrCreateInvite(householdId: string, role: 'member' | 'helper' = 'member'): Promise<string> {
  const existing = check(
    await supabase
      .from('invites')
      .select('code')
      .eq('household_id', householdId)
      .eq('role', role)
      .gt('expires_at', new Date(Date.now() + 24 * 60 * 60_000).toISOString()) // at least a day left
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ) as { code: string } | null;
  if (existing) return existing.code;
  const rows = check(await supabase.rpc('create_invite', { hh: householdId, invite_role: role })) as { code: string }[];
  return rows[0].code;
}

// Returns the household's id
export async function joinHousehold(code: string, p: Profile): Promise<string> {
  return check(
    await supabase.rpc('join_household', {
      invite_code: code,
      display_name: p.displayName.trim(),
      gender: p.gender,
      dialect: p.dialect,
      view_language: p.viewLanguage,
    }),
  ) as string;
}

// --- Family ------------------------------------------------------------------------------------------

export type ProfilePatch = Partial<
  Pick<Member, 'display_name' | 'gender' | 'avatar_color' | 'view_language' | 'speaks' | 'dialect'>
>;

export async function updateMember(id: string, patch: ProfilePatch & { settings?: HouseholdSettings }) {
  check(await supabase.from('members').update(patch).eq('id', id));
}

export async function setMemberRole(id: string, role: MemberRole) {
  check(await supabase.rpc('set_member_role', { member: id, new_role: role }));
}

export async function removeMember(id: string) {
  check(await supabase.rpc('remove_member', { member: id }));
}

export async function restoreMember(id: string) {
  check(await supabase.rpc('restore_member', { member: id }));
}

// «امسح القائمة» — manager only; the list disappears for everyone (kept in the database, see the migration)
export async function deleteHousehold(householdId: string) {
  check(await supabase.rpc('delete_household', { hh: householdId }));
}

// «اخرج من القائمة» — only for me; the others keep it
export async function leaveHousehold(householdId: string) {
  check(await supabase.rpc('leave_household', { hh: householdId }));
}

export async function renameHousehold(householdId: string, name: string) {
  check(await supabase.from('households').update({ name: name.trim() }).eq('id', householdId));
}

// --- List items ----------------------------------------------------------------------------------

export type ItemRow = {
  id: string;
  household_id: string;
  catalog_id: string | null;
  name: string;
  qty: number | string; // numeric comes back as text
  unit: Item['unit'];
  category: Item['category'];
  status: Item['status'];
  note: string;
  added_by: string | null;
  added_via: Item['added_via'];
  voice_transcript: string | null;
  requested_by: string[];
  claimed_by: string | null;
  created_at: string;
};

export const toItem = (row: ItemRow): Item => {
  const match = findCatalogMatch(row.name);
  return {
    id: row.id,
    name: row.name,
    qty: Number(row.qty),
    unit: row.unit,
    category: row.category,
    status: row.status,
    note: row.note,
    added_by: row.added_by ?? '',
    added_via: row.added_via,
    voice_transcript: row.voice_transcript ?? undefined,
    requested_by: row.requested_by,
    claimed_by: row.claimed_by,
    created_at: row.created_at,
    translations: match?.translations, // helper names come from the catalog
  };
};

// The fields anyone in the household may change (see the column grants in the database)
export type ItemPatch = Partial<Pick<Item, 'name' | 'qty' | 'unit' | 'category' | 'status' | 'note' | 'requested_by' | 'claimed_by'>>;

const pickPatch = (patch: Partial<Item>): ItemPatch => {
  const keys = ['name', 'qty', 'unit', 'category', 'status', 'note', 'requested_by', 'claimed_by'] as const;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (patch[k] !== undefined) out[k] = patch[k];
  return out as ItemPatch;
};

// Items still worth showing or counting: open, in a cart, or done in the last 60 days
export async function loadItems(householdId: string): Promise<Item[]> {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60_000).toISOString();
  const rows = check(
    await supabase
      .from('items')
      .select('*')
      .eq('household_id', householdId)
      .or(`status.in.(open,in_cart),updated_at.gte.${since}`)
      .order('created_at'),
  ) as ItemRow[];
  return rows.map(toItem);
}

export async function insertItems(householdId: string, items: Item[]) {
  if (items.length === 0) return;
  check(
    await supabase.from('items').insert(
      items.map((i) => ({
        id: i.id,
        household_id: householdId,
        catalog_id: findCatalogMatch(i.name)?.id ?? null,
        name: i.name,
        qty: i.qty,
        unit: i.unit,
        category: i.category,
        status: i.status,
        note: i.note,
        added_by: i.added_by,
        added_via: i.added_via,
        voice_transcript: i.voice_transcript ?? null,
        requested_by: i.requested_by,
        claimed_by: i.claimed_by,
      })),
    ),
  );
}

export async function updateItem(id: string, patch: Partial<Item>) {
  const fields = pickPatch(patch);
  if (Object.keys(fields).length === 0) return;
  check(await supabase.from('items').update(fields).eq('id', id));
}

// Live changes to this household's list. Returns a function that stops listening.
export function watchItems(
  householdId: string,
  onChange: (change: { type: 'upsert'; item: Item; isNew: boolean } | { type: 'delete'; id: string }) => void,
) {
  const channel = supabase
    .channel(`items:${householdId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'items', filter: `household_id=eq.${householdId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') onChange({ type: 'delete', id: (payload.old as ItemRow).id });
        else onChange({ type: 'upsert', item: toItem(payload.new as ItemRow), isNew: payload.eventType === 'INSERT' });
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// A real database id for a new item, made on the phone so it shows instantly and matches the live echo
export function newItemId(): string {
  const bytes = new Uint8Array(16);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// --- Activity («آخر نشاط») -------------------------------------------------------------------------

export type ActivityEvent = {
  memberId: string;
  kind: 'added' | 'bought';
  voice: boolean;
  name: string;
  at: string;
};

// Recent additions and purchases, from the item history the database writes by itself
export async function loadActivity(householdId: string, limit = 200): Promise<ActivityEvent[]> {
  const rows = check(
    await supabase
      .from('item_events')
      .select('member_id, kind, before, after, created_at')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ) as {
    member_id: string | null;
    kind: 'added' | 'changed';
    before: Partial<ItemRow> | null;
    after: Partial<ItemRow> | null;
    created_at: string;
  }[];
  const events: ActivityEvent[] = [];
  for (const r of rows) {
    if (!r.member_id || !r.after) continue;
    if (r.kind === 'added') {
      events.push({ memberId: r.member_id, kind: 'added', voice: r.after.added_via === 'voice', name: r.after.name ?? '', at: r.created_at });
    } else if (r.after.status === 'bought' && r.before?.status !== 'bought') {
      events.push({ memberId: r.member_id, kind: 'bought', voice: false, name: r.after.name ?? '', at: r.created_at });
    }
  }
  return events;
}

// --- Trips and questions -----------------------------------------------------------------------

type TripRow = {
  id: string;
  household_id: string;
  shopper_id: string;
  store: StoreKey;
  mode: 'solo' | 'split';
  partner_id: string | null;
  started_at: string;
  ended_at: string | null;
};

type QuestionRow = {
  id: string;
  household_id: string;
  trip_id: string | null;
  item_id: string;
  from_member: string | null;
  to_member: string | null;
  alt_name: string | null;
  answer: QuestionAnswer | null;
  reply: string | null;
  created_at: string;
};

const toActiveTrip = (r: TripRow): ActiveTrip => ({
  id: r.id,
  shopperId: r.shopper_id,
  store: r.store,
  mode: r.mode,
  partnerId: r.partner_id,
  startedAt: r.started_at,
});

const toQuestion = (r: QuestionRow): Question => ({
  id: r.id,
  tripId: r.trip_id ?? '',
  itemId: r.item_id,
  from: r.from_member ?? '',
  to: r.to_member ?? '',
  createdAt: r.created_at,
  altName: r.alt_name,
  answer: r.answer,
  reply: r.reply,
});

// Trips still going (anyone's) + questions from the last day
export async function loadTripState(householdId: string): Promise<{ trips: ActiveTrip[]; questions: Question[] }> {
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const [trips, questions] = await Promise.all([
    supabase.from('trips').select('*').eq('household_id', householdId).is('ended_at', null).order('started_at'),
    supabase.from('questions').select('*').eq('household_id', householdId).gte('created_at', since).order('created_at'),
  ]);
  return {
    trips: (check(trips) as TripRow[]).map(toActiveTrip),
    questions: (check(questions) as QuestionRow[]).map(toQuestion),
  };
}

export async function startTrip(householdId: string, trip: ActiveTrip) {
  check(
    await supabase.from('trips').insert({
      id: trip.id,
      household_id: householdId,
      shopper_id: trip.shopperId,
      store: trip.store,
      mode: trip.mode,
      partner_id: trip.partnerId,
      started_at: trip.startedAt,
    }),
  );
}

export async function endTrip(id: string, handoff = false) {
  check(await supabase.from('trips').update({ ended_at: new Date().toISOString(), handoff }).eq('id', id));
}

export async function saveTripAmount(id: string, amount: number) {
  check(await supabase.from('trips').update({ amount_paid: amount }).eq('id', id));
}

export async function askQuestion(householdId: string, q: Question) {
  check(
    await supabase.from('questions').insert({
      id: q.id,
      household_id: householdId,
      trip_id: q.tripId || null,
      item_id: q.itemId,
      from_member: q.from,
      to_member: q.to,
      alt_name: q.altName,
    }),
  );
}

export async function answerQuestion(id: string, answer: QuestionAnswer, reply: string) {
  check(
    await supabase.from('questions').update({ answer, reply, answered_at: new Date().toISOString() }).eq('id', id),
  );
}

// Live trips and questions for this household. Returns a function that stops listening.
export function watchTripsAndQuestions(
  householdId: string,
  on: {
    trip: (trip: ActiveTrip, ended: boolean, isNew: boolean) => void;
    question: (q: Question, isNew: boolean) => void;
  },
) {
  const filter = `household_id=eq.${householdId}`;
  const channel = supabase
    .channel(`trips:${householdId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter }, (p) => {
      if (p.eventType === 'DELETE') return;
      const row = p.new as TripRow;
      on.trip(toActiveTrip(row), !!row.ended_at, p.eventType === 'INSERT');
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter }, (p) => {
      if (p.eventType === 'DELETE') return;
      on.question(toQuestion(p.new as QuestionRow), p.eventType === 'INSERT');
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
