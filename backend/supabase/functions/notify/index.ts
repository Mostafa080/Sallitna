// Edge Function `notify` — the app calls it right after something happens (a trip started, a question was
// asked…). It checks who's calling, works out who should hear about it (notify.ts) and sends the notifications
// through Expo's push service. Deploy (from backend/): npx supabase functions deploy notify
//
// Uses the service key that Supabase puts in every Edge Function's environment — it never leaves Supabase.
// Optional: EXPO_ACCESS_TOKEN (a function secret) if «enhanced push security» is turned on in Expo.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { plan, type Db, type PushMessage } from './notify.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH = 100; // Expo takes at most 100 messages per request

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Who's asking: the signed-in person's own token, checked by Supabase Auth
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await supabase.auth.getUser(jwt);
  const userId = auth?.user?.id;
  if (!userId) return json({ error: 'not signed in' }, 401);

  let event;
  try {
    event = await req.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  try {
    console.log('[notify] event', event?.type);
    const messages = await plan(database(supabase), userId, event);
    const sent = await sendToExpo(supabase, messages);
    if (messages.length) console.log(`[notify] Expo accepted ${sent} of ${messages.length}`);
    return json({ sent });
  } catch (error) {
    console.error('[notify]', error);
    return json({ error: 'failed' }, 500);
  }
});

// The few reads notify.ts needs (service key: sees every household, so notify.ts checks ownership itself)
function database(supabase: ReturnType<typeof createClient>): Db {
  const rows = async <T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  };
  const one = async <T>(query: PromiseLike<{ data: T[] | null; error: unknown }>) => (await rows<T>(query))[0] ?? null;
  const memberColumns = 'id, household_id, user_id, display_name, gender, view_language, settings, left_at';
  const translationMap = (list: { id?: string; name?: string; translations: { en?: string; hi?: string } | null }[], key: 'id' | 'name') =>
    Object.fromEntries(list.map((r) => [r[key]!, r.translations ?? {}]));

  return {
    trip: (id) => one(supabase.from('trips').select('*').eq('id', id).limit(1)),
    activeTrips: (householdId) => rows(supabase.from('trips').select('*').eq('household_id', householdId).is('ended_at', null)),
    question: (id) => one(supabase.from('questions').select('*').eq('id', id).limit(1)),
    items: (ids) =>
      rows(supabase.from('items').select('id, household_id, name, catalog_id, added_by, created_at').in('id', ids)),
    member: (id) => one(supabase.from('members').select(memberColumns).eq('id', id).limit(1)),
    members: (householdId) =>
      rows(supabase.from('members').select(memberColumns).eq('household_id', householdId).is('left_at', null)),
    household: (id) => one(supabase.from('households').select('name').eq('id', id).is('deleted_at', null).limit(1)),
    translations: async (ids) =>
      translationMap(await rows(supabase.from('catalog').select('id, translations').in('id', ids)), 'id'),
    translationsByName: async (names) =>
      translationMap(await rows(supabase.from('catalog').select('name, translations').in('name', names)), 'name'),
    tokens: (userIds) => rows(supabase.from('push_tokens').select('token, user_id, time_zone').in('user_id', userIds)),
    claim: async (kind, refs) => {
      const { data, error } = await supabase.rpc('claim_push', { push_kind: kind, refs });
      if (error) throw error;
      // setof uuid comes back as a list of ids (or of single-value rows on some versions)
      return ((data ?? []) as unknown[]).map((r) => (typeof r === 'string' ? r : String(Object.values(r as object)[0])));
    },
  };
}

// Send through Expo; a phone that uninstalled the app («DeviceNotRegistered») is forgotten
async function sendToExpo(supabase: ReturnType<typeof createClient>, messages: PushMessage[]) {
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  let sent = 0;
  for (let i = 0; i < messages.length; i += EXPO_BATCH) {
    const batch = messages.slice(i, i + EXPO_BATCH);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      console.error('[notify] expo', response.status, await response.text());
      continue;
    }
    const { data: tickets } = (await response.json()) as {
      data: { status: 'ok' | 'error'; message?: string; details?: { error?: string } }[];
    };
    const gone = batch.filter((_, n) => tickets[n]?.details?.error === 'DeviceNotRegistered').map((m) => m.to);
    if (gone.length) await supabase.from('push_tokens').delete().in('token', gone);
    for (const t of tickets) if (t.status !== 'ok') console.error('[notify] expo refused', JSON.stringify(t));
    sent += tickets.filter((t) => t.status === 'ok').length;
  }
  return sent;
}
