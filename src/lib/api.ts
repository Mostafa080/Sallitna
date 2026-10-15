// Everything the app asks the database for, in one place.
// Shapes are converted to the app's own types (src/data/fakeHousehold.ts) here.

import {
  defaultSettings,
  PHONE_PREFIX,
  type DialectKey,
  type HouseholdSettings,
  type LanguageKey,
  type Member,
  type MemberRole,
} from '@/data/fakeHousehold';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

// Which of my lists was open last (each list = one household with its own people)
const CURRENT_KEY = 'sallitna.currentHousehold';
export const rememberHousehold = (id: string) => AsyncStorage.setItem(CURRENT_KEY, id).catch(() => {});
const rememberedHousehold = () => AsyncStorage.getItem(CURRENT_KEY).catch(() => null);

// "+966551234567" from "551234567"
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

export type ListSummary = { householdId: string; name: string; memberCount: number };

// All my lists, newest first
export async function listMyHouseholds(): Promise<ListSummary[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return [];
  const rows = check(
    await supabase
      .from('members')
      .select('household_id, joined_at, households(name, members(count))')
      .eq('user_id', uid)
      .is('left_at', null)
      .is('households.members.left_at', null)
      .order('joined_at', { ascending: false }),
  ) as unknown as { household_id: string; households: { name: string; members: { count: number }[] } | null }[];
  return rows.map((r) => ({
    householdId: r.household_id,
    name: r.households?.name ?? '',
    memberCount: r.households?.members?.[0]?.count ?? 1,
  }));
}

// One of my households: the one asked for, else the last one opened, else the newest (null if none yet)
export async function loadMembership(householdId?: string): Promise<Membership | null> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return null;

  const mineAll = check(
    await supabase
      .from('members')
      .select('*, households(name)')
      .eq('user_id', uid)
      .is('left_at', null)
      .order('joined_at', { ascending: false }),
  ) as (MemberRow & { households: { name: string } | null })[];
  if (mineAll.length === 0) return null;

  const wanted = householdId ?? (await rememberedHousehold());
  const mine = mineAll.find((m) => m.household_id === wanted) ?? mineAll[0];
  rememberHousehold(mine.household_id);

  const rows = check(
    await supabase.from('members').select('*').eq('household_id', mine.household_id).order('joined_at'),
  ) as MemberRow[];

  return {
    householdId: mine.household_id,
    householdName: mine.households?.name ?? '',
    meId: mine.id,
    members: rows.filter((r) => !r.left_at).map(toMember),
    formerMembers: rows.filter((r) => r.left_at).map(toMember),
    settings: { ...defaultSettings, ...(mine.settings ?? {}) },
  };
}

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
  };
}

// Reuse a still-valid invite I can see, or make a new one
export async function getOrCreateInvite(householdId: string): Promise<string> {
  const existing = check(
    await supabase
      .from('invites')
      .select('code')
      .eq('household_id', householdId)
      .eq('role', 'member')
      .gt('expires_at', new Date(Date.now() + 24 * 60 * 60_000).toISOString()) // at least a day left
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ) as { code: string } | null;
  if (existing) return existing.code;
  const rows = check(await supabase.rpc('create_invite', { hh: householdId })) as { code: string }[];
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

export async function renameHousehold(householdId: string, name: string) {
  check(await supabase.from('households').update({ name: name.trim() }).eq('id', householdId));
}
