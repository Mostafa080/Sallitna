// Who gets which notification, and what it says. The app reports what just happened (it started a trip,
// asked a question…); everything is checked against the database first — the event must exist, be recent,
// and be the caller's own — so nobody can send fake or repeated notifications.
// The database access is passed in (see index.ts), so this file can be tested without Supabase.

import { itemList, say, things, type Gender, type Lang } from './messages.ts';

export type NotifyEvent =
  | { type: 'trip_started'; tripId: string }
  | { type: 'trip_done'; tripId: string; bought: number; notFound: number }
  | { type: 'question'; questionId: string }
  | { type: 'answer'; questionId: string }
  | { type: 'items_added'; itemIds: string[] };

export type Member = {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string;
  gender: Gender;
  view_language: Lang;
  settings: Record<string, unknown> | null;
  left_at: string | null;
};
export type Trip = {
  id: string;
  household_id: string;
  shopper_id: string;
  partner_id: string | null;
  started_at: string;
  ended_at: string | null;
  handoff: boolean;
};
export type Question = {
  id: string;
  household_id: string;
  item_id: string;
  from_member: string | null;
  to_member: string | null;
  alt_name: string | null;
  answer: 'alt' | 'no' | 'next' | null;
  reply: string | null;
  created_at: string;
  answered_at: string | null;
};
export type Item = {
  id: string;
  household_id: string;
  name: string;
  catalog_id: string | null;
  added_by: string | null;
  created_at: string;
};
export type PushToken = { token: string; user_id: string; time_zone: string };
export type PushMessage = { to: string; title: string; body: string; data: Record<string, string>; sound: 'default' };

export type Db = {
  trip(id: string): Promise<Trip | null>;
  activeTrips(householdId: string): Promise<Trip[]>;
  question(id: string): Promise<Question | null>;
  items(ids: string[]): Promise<Item[]>;
  member(id: string): Promise<Member | null>;
  members(householdId: string): Promise<Member[]>; // current members only
  household(id: string): Promise<{ name: string } | null>; // null when deleted
  translations(catalogIds: string[]): Promise<Record<string, { en?: string; hi?: string }>>; // by catalog id
  translationsByName(names: string[]): Promise<Record<string, { en?: string; hi?: string }>>; // by Arabic name
  tokens(userIds: string[]): Promise<PushToken[]>;
  claim(kind: string, refs: string[]): Promise<string[]>; // the refs not announced before
};

// Events older than this are not announced (a late retry, or someone replaying an old one)
const RECENT_MS = 30 * 60_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 50;

// Same defaults as the app (defaultSettings in fakeHousehold.ts)
const DEFAULTS: Record<string, boolean> = {
  notifyTripStarted: true,
  notifyAddedWhileShopping: true,
  notifyEveryAdd: false,
  quietHours: true,
};
const setting = (m: Member, key: string) => {
  const value = m.settings?.[key];
  return typeof value === 'boolean' ? value : DEFAULTS[key];
};

const recent = (iso: string | null, now: number) => !!iso && now - Date.parse(iso) < RECENT_MS && Date.parse(iso) <= now + 60_000;
const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(999, Math.round(n))) : 0);

// «وقت الهدوء»: 11pm–7am where the phone is
export function isQuietHour(timeZone: string, now: number) {
  let hour: number;
  try {
    hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now));
  } catch {
    hour = new Date(now).getUTCHours();
  }
  return hour >= 23 || hour < 7;
}

// Why nothing was sent, in the function's log (Supabase → Edge Functions → notify → Logs)
const skip = (why: string): PushMessage[] => {
  console.log(`[notify] nothing sent: ${why}`);
  return [];
};

type Draft = { member: Member; body: string; data: Record<string, string> };

// Turn drafts into one message per phone, skipping «وقت الهدوء» when asked to
async function toMessages(db: Db, title: string, drafts: Draft[], quiet: boolean, now: number): Promise<PushMessage[]> {
  if (drafts.length === 0) return skip('nobody else to tell (or their settings are off)');
  const tokens = await db.tokens([...new Set(drafts.map((d) => d.member.user_id))]);
  const messages: PushMessage[] = [];
  for (const d of drafts) {
    for (const t of tokens.filter((t) => t.user_id === d.member.user_id)) {
      if (quiet && setting(d.member, 'quietHours') && isQuietHour(t.time_zone, now)) continue;
      messages.push({ to: t.token, title, body: d.body, data: d.data, sound: 'default' });
    }
  }
  console.log(
    `[notify] ${drafts.length} people, ${tokens.length} phones, ${messages.length} messages` +
      (messages.length < tokens.length ? ' (others in «وقت الهدوء»)' : ''),
  );
  return messages;
}

// A product's name in someone's language (Arabic is what's stored; English / Hindi come from the catalog)
const nameIn = (lang: Lang, arabic: string, translation?: { en?: string; hi?: string }) =>
  lang === 'ar' ? arabic : (translation?.[lang] ?? translation?.en ?? arabic);

// Is this a real, current member who belongs to the caller?
const isMine = (m: Member | null, userId: string): m is Member => !!m && m.user_id === userId && !m.left_at;

export async function plan(db: Db, userId: string, event: NotifyEvent, now = Date.now()): Promise<PushMessage[]> {
  switch (event?.type) {
    case 'trip_started':
    case 'trip_done': {
      if (!UUID.test(String(event.tripId))) return skip('bad trip id');
      const trip = await db.trip(event.tripId);
      if (!trip) return skip('trip not found');
      const shopper = await db.member(trip.shopper_id);
      if (!isMine(shopper, userId)) return skip('caller is not the shopper');
      const starting = event.type === 'trip_started';
      if (starting ? trip.ended_at || !recent(trip.started_at, now) : !recent(trip.ended_at, now) || trip.handoff) return skip('trip not current (ended / too old / handed over)');
      const bought = starting ? 0 : count(event.bought);
      const notFound = starting ? 0 : count(event.notFound);
      if (!starting && bought + notFound === 0) return skip('nothing bought or missing');
      const household = await db.household(trip.household_id);
      if (!household) return skip('list deleted');
      if ((await db.claim(event.type, [trip.id])).length === 0) return skip('already announced');

      const others = (await db.members(trip.household_id)).filter(
        (m) => m.id !== shopper.id && m.id !== trip.partner_id && (!starting || setting(m, 'notifyTripStarted')),
      );
      const g = shopper.gender;
      const drafts = others.map((m) => {
        const lang = m.view_language;
        const body = starting
          ? say(lang, 'tripStarted', { name: shopper.display_name })
          : say(lang, `done_${g}`, { name: shopper.display_name, bought: things(lang, bought) }) +
            (notFound > 0 ? say(lang, `doneNotFound_${g}`, { missing: things(lang, notFound) }) : '');
        return { member: m, body, data: { type: event.type, householdId: trip.household_id } };
      });
      return toMessages(db, household.name, drafts, true, now);
    }

    case 'question':
    case 'answer': {
      if (!UUID.test(String(event.questionId))) return skip('bad question id');
      const q = await db.question(event.questionId);
      if (!q || !q.from_member || !q.to_member) return skip('question not found / no sender or receiver');
      const asking = event.type === 'question';
      const [from, to] = await Promise.all([db.member(q.from_member), db.member(q.to_member)]);
      if (!from || !to || from.left_at || to.left_at) return skip('asker or receiver left the list');
      // The question is sent by whoever asked; the answer by whoever it was asked to
      if (!isMine(asking ? from : to, userId)) return skip('caller is not the asker / answerer');
      if (asking ? q.answer || !recent(q.created_at, now) : !q.answer || !recent(q.answered_at, now)) return skip('question already answered / not answered / too old');
      const household = await db.household(q.household_id);
      if (!household) return skip('list deleted');
      if ((await db.claim(event.type, [q.id])).length === 0) return skip('already announced');

      const recipient = asking ? to : from;
      const lang = recipient.view_language;
      const [item] = await db.items([q.item_id]);
      const byId = item?.catalog_id ? await db.translations([item.catalog_id]) : {};
      const byName = q.alt_name ? await db.translationsByName([q.alt_name]) : {};
      const itemName = nameIn(lang, item?.name ?? '', item?.catalog_id ? byId[item.catalog_id] : undefined);
      const alt = q.alt_name ? nameIn(lang, q.alt_name, byName[q.alt_name]) : '';

      let body: string;
      if (asking) {
        body = say(lang, alt ? `question_${from.gender}` : `questionNoAlt_${from.gender}`, {
          name: from.display_name,
          item: itemName,
          alt,
        });
      } else {
        const reply = q.reply?.trim()
          ? q.reply.trim()
          : q.answer === 'alt'
            ? say(lang, `replyAlt_${from.gender}`, { alt: alt || itemName })
            : say(lang, q.answer === 'no' ? 'replyNo' : 'replyNext');
        body = say(lang, `answered_${to.gender}`, { name: to.display_name, reply });
      }
      const data: Record<string, string> = { type: event.type, householdId: q.household_id, questionId: q.id };
      // Someone is waiting in the store: questions and answers come through even in «وقت الهدوء»
      return toMessages(db, household.name, [{ member: recipient, body, data }], false, now);
    }

    case 'items_added': {
      const ids = Array.isArray(event.itemIds) ? event.itemIds.filter((id) => UUID.test(String(id))).slice(0, MAX_ITEMS) : [];
      if (ids.length === 0) return skip('no item ids');
      const found = await db.items(ids);
      if (found.length === 0) return skip('items not found');
      const householdId = found[0].household_id;
      const adderId = found[0].added_by;
      if (!adderId) return skip('item has no adder');
      const adder = await db.member(adderId);
      if (!isMine(adder, userId)) return skip('caller did not add these items');
      // Only the caller's own, fresh additions to one list
      const items = found.filter((i) => i.household_id === householdId && i.added_by === adderId && recent(i.created_at, now));
      if (items.length === 0) return skip('items too old');
      const household = await db.household(householdId);
      if (!household) return skip('list deleted');

      const [trips, members] = await Promise.all([db.activeTrips(householdId), db.members(householdId)]);
      const shopping = new Set(trips.flatMap((t) => [t.shopper_id, t.partner_id ?? '']).filter(Boolean));
      const recipients = members.filter(
        (m) =>
          m.id !== adder.id &&
          ((shopping.has(m.id) && setting(m, 'notifyAddedWhileShopping')) || setting(m, 'notifyEveryAdd')),
      );
      if (recipients.length === 0) return skip('nobody shopping or following every add');
      const fresh = new Set(await db.claim('item', items.map((i) => i.id)));
      const announced = items.filter((i) => fresh.has(i.id));
      if (announced.length === 0) return skip('already announced');

      const catalogIds = announced.map((i) => i.catalog_id).filter((id): id is string => !!id);
      const translations = catalogIds.length ? await db.translations(catalogIds) : {};
      const drafts = recipients.map((m) => {
        const lang = m.view_language;
        const names = announced.map((i) => nameIn(lang, i.name, i.catalog_id ? translations[i.catalog_id] : undefined));
        return {
          member: m,
          body: say(lang, `added_${adder.gender}`, { name: adder.display_name, items: itemList(lang, names) }),
          data: { type: 'items_added', householdId },
        };
      });
      return toMessages(db, household.name, drafts, true, now);
    }

    default:
      return skip('unknown event type');
  }
}
