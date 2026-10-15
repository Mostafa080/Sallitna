// The household list, shared by every screen.
// Two worlds: 'live' — signed in, family data from Supabase (items still in memory until session 12) —
// and 'demo' — the fake household from earlier sessions (long-press the logo on welcome).
// Undo will map to item_events.

import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react';

import { catalogById, catalogToDraft, findCatalogMatch } from '@/data/fakeCatalog';
import {
  activeShopperId,
  currentMemberId as demoMeId,
  defaultSettings,
  household,
  LIVE_ADD_DELAY_MS,
  liveAdderId,
  makeDemoItems,
  members as demoMembers,
  pendingInvites,
  type Basic,
  type HouseholdSettings,
  type Item,
  type DialectKey,
  type ItemDraft,
  type LanguageKey,
  type Member,
  type PendingInvite,
  type StoreKey,
} from '@/data/fakeHousehold';
import { t } from '@/i18n';
import * as api from '@/lib/api';
import { normalizeArabic } from '@/lib/arabic';
import { supabase } from '@/lib/supabase';
import { formatQuantity } from '@/lib/format';
import type { ListChange } from '@/lib/voiceReview';
import type { ActiveTrip, Question, QuestionAnswer, Trip, TripOutcome, TripSummary } from '@/store/tripTypes';

// What "undo" reverses: items to put back as they were, and newly added items to take away.
// Family changes undo by putting the whole member list back.
export type Undo = {
  restore: Item[];
  discard: string[];
  members?: Member[];
};

export type Toast = {
  id: number;
  message: string;
  undo?: Undo;
};

type State = {
  items: Item[];
  toast: Toast | null;
  trip: Trip | null; // the trip this phone's member is on
  questions: Question[];
  summary: TripSummary | null; // last finished trip, for the summary screen
  offline: boolean; // simulated
  pendingSync: string[]; // item ids put in the cart while offline
  members: Member[];
  invites: PendingInvite[];
  householdName: string;
  settings: HouseholdSettings;
  meId: string; // the person using this phone
  mode: Mode;
  householdId: string | null; // live only
  formerMembers: Member[]; // live: removed/left people, so old items keep their names
  inviteCode: string | null; // live: this household's current invite code
  lists: api.ListSummary[]; // all my lists (live) — each is its own household with its own people
  hasSignupProfile: boolean; // needsHousehold: «عرّفنا عليك» already answered → go to «أنشئ قائمتك الأولى»
  activeTrips: ActiveTrip[]; // live: other people's trips still going («سارة في السوق»)
};

// loading: checking sign-in · signedOut: show welcome · needsHousehold: signed in, no household yet
export type Mode = 'loading' | 'signedOut' | 'needsHousehold' | 'demo' | 'live';

type Action =
  | { type: 'patch'; id: string; patch: Partial<Item> }
  | { type: 'add'; items: Item[] }
  | { type: 'discard'; ids: string[] }
  | { type: 'undo'; undo: Undo }
  | { type: 'reset'; items: Item[] }
  | { type: 'toast'; toast: Toast | null }
  | { type: 'set'; patch: Partial<Omit<State, 'items' | 'toast'>> }
  | { type: 'trip'; patch: Partial<Trip> }
  | { type: 'liveAdd'; item: Item }
  | { type: 'replace'; state: State }
  | { type: 'remoteUpsert'; item: Item }
  | { type: 'remoteDelete'; id: string }
  | { type: 'loadedItems'; householdId: string; items: Item[] }
  | { type: 'loadedTrips'; householdId: string; trips: ActiveTrip[]; questions: Question[] }
  | { type: 'tripChanged'; trip: ActiveTrip; ended: boolean }
  | { type: 'questionChanged'; question: Question };

function initialState(mode: Mode = 'loading'): State {
  return {
    items: [],
    toast: null,
    trip: null,
    questions: [],
    summary: null,
    offline: false,
    pendingSync: [],
    members: [],
    invites: [],
    householdName: '',
    settings: defaultSettings,
    meId: '',
    mode,
    householdId: null,
    formerMembers: [],
    inviteCode: null,
    lists: [],
    hasSignupProfile: false,
    activeTrips: [],
  };
}

// The fake household from sessions 1–9
function demoState(): State {
  return {
    ...initialState('demo'),
    items: makeDemoItems(),
    toast: null,
    trip: null,
    questions: [],
    summary: null,
    offline: false,
    pendingSync: [],
    members: demoMembers,
    invites: pendingInvites,
    householdName: household.name,
    settings: defaultSettings,
    meId: demoMeId,
    lists: [{ householdId: household.id, name: household.name, memberCount: demoMembers.length }],
  };
}

const liveState = (m: api.Membership, items: Item[] = [], lists: api.ListSummary[] = []): State => ({
  ...initialState('live'),
  lists,
  items,
  members: m.members,
  formerMembers: m.formerMembers,
  householdName: m.householdName,
  householdId: m.householdId,
  meId: m.meId,
  settings: m.settings,
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'patch':
      return {
        ...state,
        items: state.items.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item)),
      };
    case 'add':
      return { ...state, items: [...state.items, ...action.items] };
    case 'discard':
      return { ...state, items: state.items.filter((item) => !action.ids.includes(item.id)) };
    case 'undo': {
      const byId = new Map(action.undo.restore.map((s) => [s.id, s]));
      return {
        ...state,
        items: state.items
          .filter((item) => !action.undo.discard.includes(item.id))
          .map((item) => byId.get(item.id) ?? item),
        members: action.undo.members ?? state.members,
        toast: null,
      };
    }
    case 'reset':
      return { ...demoState(), items: action.items };
    case 'toast':
      return { ...state, toast: action.toast };
    case 'set':
      return { ...state, ...action.patch };
    case 'trip':
      return state.trip ? { ...state, trip: { ...state.trip, ...action.patch } } : state;
    case 'replace':
      return action.state;
    case 'remoteUpsert': {
      const exists = state.items.some((i) => i.id === action.item.id);
      // Added by the family while I'm shopping: goes on my trip as «just added»
      const addToTrip = !exists && state.trip && action.item.status === 'open';
      return {
        ...state,
        items: exists
          ? state.items.map((i) => (i.id === action.item.id ? action.item : i))
          : [...state.items, action.item],
        trip:
          addToTrip && state.trip
            ? {
                ...state.trip,
                itemIds: [...state.trip.itemIds, action.item.id],
                addedIds: [...state.trip.addedIds, action.item.id],
              }
            : state.trip,
      };
    }
    case 'loadedTrips': {
      if (state.householdId !== action.householdId) return state;
      const mine = action.trips.find((t) => t.shopperId === state.meId);
      // Reopened the app mid-trip: back into shopping mode (what was asked is kept, the rest starts fresh)
      const trip =
        state.trip ??
        (mine
          ? {
              ...mine,
              itemIds: state.items.filter((i) => i.status === 'open' || i.status === 'in_cart').map((i) => i.id),
              addedIds: [],
              skippedIds: action.questions
                .filter((q) => q.tripId === mine.id && q.answer !== 'alt')
                .map((q) => q.itemId),
              outcomes: [],
            }
          : null);
      return {
        ...state,
        activeTrips: action.trips.filter((t) => t.shopperId !== state.meId),
        questions: action.questions,
        trip,
      };
    }
    case 'tripChanged': {
      if (action.trip.shopperId === state.meId) return state;
      const others = state.activeTrips.filter((t) => t.id !== action.trip.id);
      return { ...state, activeTrips: action.ended ? others : [...others, action.trip] };
    }
    case 'questionChanged': {
      const q = action.question;
      const before = state.questions.find((x) => x.id === q.id);
      const questions = before ? state.questions.map((x) => (x.id === q.id ? q : x)) : [...state.questions, q];
      // My question just got answered while I'm still shopping: update the trip
      const trip = state.trip;
      if (!trip || trip.id !== q.tripId || !q.answer || before?.answer) return { ...state, questions };
      const item = state.items.find((i) => i.id === q.itemId);
      const base = { itemId: q.itemId, name: item?.name ?? '', answeredBy: q.to, reply: q.reply ?? undefined };
      const next: TripOutcome =
        q.answer === 'alt'
          ? { ...base, decision: 'swapped', alt: q.altName ?? item?.name }
          : { ...base, decision: q.answer === 'no' ? 'removed' : 'next' };
      return {
        ...state,
        questions,
        trip: {
          ...trip,
          skippedIds: q.answer === 'alt' ? trip.skippedIds.filter((s) => s !== q.itemId) : trip.skippedIds,
          outcomes: [...trip.outcomes.filter((o) => o.itemId !== q.itemId), next],
        },
      };
    }
    case 'remoteDelete':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'loadedItems':
      // Ignore a slow answer for a list we already left
      return state.householdId === action.householdId ? { ...state, items: action.items } : state;
    case 'liveAdd':
      // Only while still shopping, and only once
      if (!state.trip || state.items.some((i) => i.status === 'open' && sameName(i.name, action.item.name)))
        return state;
      return {
        ...state,
        items: [...state.items, action.item],
        trip: {
          ...state.trip,
          itemIds: [...state.trip.itemIds, action.item.id],
          addedIds: [...state.trip.addedIds, action.item.id],
        },
      };
  }
}

const LAUNCH_RETRY_MS = 3000;

let toastCounter = 0;
let idCounter = 0;

const sameName = (a: string, b: string) => normalizeArabic(a) === normalizeArabic(b);

const newId = (prefix: string) => `${prefix}-${Date.now()}-${++idCounter}`;

function newItem(draft: ItemDraft, addedBy: string, voiceTranscript?: string): Item {
  return {
    ...draft,
    id: api.newItemId(), // a real database id, also fine for the demo
    status: 'open',
    note: '',
    added_by: addedBy,
    added_via: voiceTranscript ? 'voice' : 'text',
    voice_transcript: voiceTranscript,
    requested_by: [addedBy],
    claimed_by: null,
    created_at: new Date().toISOString(),
  };
}

// What sign-up asks for
export type NewProfile = {
  displayName: string;
  gender: 'f' | 'm';
  dialect: DialectKey;
  viewLanguage: LanguageKey;
};

function useListState() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const { trip } = state;
  const me = state.meId;
  const live = state.mode === 'live';

  // On launch: signed in? in a household? (the splash stays until we know)
  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = () =>
      api
        .clearStaleSession()
        .then(() => Promise.all([api.loadMembership(), api.listMyHouseholds()]))
        .then(async ([membership, lists]) => {
          if (cancelled) return;
          if (membership) dispatch({ type: 'replace', state: liveState(membership, [], lists) });
          else if (await api.isSignedIn()) {
            const profile = await api.getSignupProfile();
            dispatch({ type: 'set', patch: { mode: 'needsHousehold', hasSignupProfile: !!profile } });
          } else dispatch({ type: 'set', patch: { mode: 'signedOut' } });
        })
        // Offline or the server didn't answer: signed in on this phone → keep the logo and try again;
        // never signed in → welcome
        .catch(async (error) => {
          if (__DEV__) console.warn('[launch]', error);
          if (cancelled) return;
          if (await api.isSignedIn()) retry = setTimeout(load, LAUNCH_RETRY_MS);
          else dispatch({ type: 'set', patch: { mode: 'signedOut' } });
        });
    load();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') dispatch({ type: 'replace', state: initialState('signedOut') });
    });
    return () => {
      cancelled = true;
      clearTimeout(retry);
      data.subscription.unsubscribe();
    };
  }, []);

  // Live list: load this household's items and keep them in sync while it's open
  const householdId = state.mode === 'live' ? state.householdId : null;
  const meRef = useRef(me);
  meRef.current = me;
  const membersRef = useRef(state.members);
  membersRef.current = state.members;
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;
  const questionsRef = useRef(state.questions);
  questionsRef.current = state.questions;
  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;
    api
      .loadItems(householdId)
      .then((items) => !cancelled && dispatch({ type: 'loadedItems', householdId, items }))
      .catch((error) => __DEV__ && console.warn('[loadItems]', error));

    api
      .loadTripState(householdId)
      .then(({ trips, questions }) => !cancelled && dispatch({ type: 'loadedTrips', householdId, trips, questions }))
      .catch((error) => __DEV__ && console.warn('[loadTripState]', error));

    const nameOf = (id: string) => membersRef.current.find((m) => m.id === id);
    const say = (message: string) => dispatch({ type: 'toast', toast: { id: ++toastCounter, message } });
    const stopTrips = api.watchTripsAndQuestions(householdId, {
      trip: (trip, ended, isNew) => {
        dispatch({ type: 'tripChanged', trip, ended });
        const who = nameOf(trip.shopperId);
        if (isNew && who && trip.shopperId !== meRef.current) {
          say(t(`toast.wentShopping_${who.gender}`, { name: who.display_name, store: t(`stores.${trip.store}`) }));
        }
      },
      question: (q, isNew) => {
        const before = questionsRef.current.find((x) => x.id === q.id);
        dispatch({ type: 'questionChanged', question: q });
        const item = itemsRef.current.find((i) => i.id === q.itemId);
        const from = nameOf(q.from);
        const to = nameOf(q.to);
        // Asked me → note (the card shows on the list); my question answered → note with the reply
        if (isNew && q.to === meRef.current && from) {
          say(t(`toast.askedYou_${from.gender}`, { name: from.display_name, item: item?.name ?? '' }));
        } else if (q.from === meRef.current && q.answer && !before?.answer && to) {
          say(t(`toast.answerArrived_${to.gender}`, { name: to.display_name, reply: q.reply ?? '' }));
        }
      },
    });

    const stop = api.watchItems(householdId, (change) => {
      if (change.type === 'delete') {
        dispatch({ type: 'remoteDelete', id: change.id });
        return;
      }
      const { item, isNew } = change;
      const known = itemsRef.current.some((i) => i.id === item.id);
      dispatch({ type: 'remoteUpsert', item });
      // Someone else added something: a small note (ticks and edits update quietly)
      if (isNew && !known && item.added_by !== meRef.current && item.status === 'open') {
        const note = (adder: Member) =>
          dispatch({
            type: 'toast',
            toast: {
              id: ++toastCounter,
              message: t(`toast.othersAdded_${adder.gender}`, { name: adder.display_name, item: item.name }),
            },
          });
        const adder = membersRef.current.find((m) => m.id === item.added_by);
        if (adder) note(adder);
        else {
          // Someone who joined after the list was opened: fetch the people again, then say who it was
          api
            .loadMembership(householdId)
            .then((m) => {
              if (!m || m.householdId !== householdId) return;
              dispatch({ type: 'set', patch: { members: m.members, formerMembers: m.formerMembers } });
              const found = m.members.find((x) => x.id === item.added_by);
              if (found) note(found);
            })
            .catch(() => {});
        }
      }
    });
    return () => {
      cancelled = true;
      stop();
      stopTrips();
    };
  }, [householdId]);

  // Simulated family (demo only): a few seconds into a trip, someone adds an item by voice
  useEffect(() => {
    if (!trip || state.mode !== 'demo') return;
    const timer = setTimeout(() => {
      const cardamom = catalogById('c20');
      if (!cardamom) return;
      const adder = demoMembers.find((m) => m.id === liveAdderId);
      dispatch({ type: 'liveAdd', item: newItem(catalogToDraft(cardamom), liveAdderId, 'هيل كيس') });
      if (adder) {
        dispatch({
          type: 'toast',
          toast: {
            id: ++toastCounter,
            message: t(`toast.liveAdded_${adder.gender}`, { name: adder.display_name, item: cardamom.name }),
          },
        });
      }
    }, LIVE_ADD_DELAY_MS);
    return () => clearTimeout(timer);
    // Once per trip
  }, [trip?.id]);

  const find = (id: string) => state.items.find((item) => item.id === id);
  // Removed members still resolve, so old items keep showing who added them
  const memberById = (id: string) =>
    state.members.find((m) => m.id === id) ??
    state.formerMembers.find((m) => m.id === id) ??
    (live ? undefined : demoMembers.find((m) => m.id === id));

  // A save to the database failed: say so, and reload what's really there
  const failed = (error: unknown) => {
    if (__DEV__) console.warn('[api]', error);
    showToast(t('toast.saveFailed'));
    api
      .loadMembership()
      .then(
        (m) =>
          m &&
          dispatch({
            type: 'set',
            patch: { members: m.members, formerMembers: m.formerMembers, householdName: m.householdName },
          }),
      );
  };
  const familyUndo = (): Undo => ({ restore: [], discard: [], members: state.members });

  // Item changes: on screen right away, then saved (live lists only). A failed save reloads the real list.
  const itemsFailed = (error: unknown) => {
    if (__DEV__) console.warn('[items]', error);
    showToast(t('toast.saveFailed'));
    const hh = state.householdId;
    if (hh) api.loadItems(hh).then((items) => dispatch({ type: 'loadedItems', householdId: hh, items })).catch(() => {});
  };
  const patchItem = (id: string, patch: Partial<Item>) => {
    dispatch({ type: 'patch', id, patch });
    if (live) api.updateItem(id, patch).catch(itemsFailed);
  };
  const addNewItems = (items: Item[]) => {
    if (items.length === 0) return;
    dispatch({ type: 'add', items });
    if (live && state.householdId) api.insertItems(state.householdId, items).catch(itemsFailed);
  };
  // Taking back a fresh addition: gone from the screen; in the database it's marked 'removed'
  // (never deleted — delete events would reach anyone listening, see the realtime migration)
  const discardItems = (ids: string[]) => {
    if (ids.length === 0) return;
    dispatch({ type: 'discard', ids });
    if (live) for (const id of ids) api.updateItem(id, { status: 'removed' }).catch(itemsFailed);
  };
  // Everyone who ever added something here — removed members too, so old items keep their names
  const everyone = live
    ? [...state.members, ...state.formerMembers]
    : [...state.members, ...demoMembers.filter((d) => !state.members.some((m) => m.id === d.id))];
  // Someone else shopping right now (live: from the trips table; demo: the fake «سارة»)
  const otherShopperId = live
    ? (state.activeTrips.find((tr) => tr.shopperId !== me)?.shopperId ?? null)
    : activeShopperId && activeShopperId !== me
      ? activeShopperId
      : null;
  const openItemNamed = (name: string) =>
    state.items.find((item) => item.status === 'open' && sameName(item.name, name));

  const showToast = (message: string, undo?: Undo) =>
    dispatch({ type: 'toast', toast: { id: ++toastCounter, message, undo } });

  const undoFor = (item: Item): Undo => ({ restore: [item], discard: [] });

  const outcome = (item: Item, decision: TripOutcome['decision'], extra: Partial<TripOutcome> = {}): TripOutcome => ({
    itemId: item.id,
    name: item.name,
    decision,
    ...extra,
  });
  const withOutcome = (outcomes: TripOutcome[], next: TripOutcome) => [
    ...outcomes.filter((o) => o.itemId !== next.itemId),
    next,
  ];

  // Reload a household from the database (after creating/joining/switching, or to see who joined).
  // Without an id: the one already open (or the last one opened). Keeps the items if it's the same list.
  const refreshHousehold = async (welcome?: string, householdId?: string): Promise<boolean> => {
    const [membership, lists] = await Promise.all([
      api.loadMembership(householdId ?? state.householdId ?? undefined),
      api.listMyHouseholds(),
    ]);
    if (!membership) {
      const profile = await api.getSignupProfile();
      dispatch({ type: 'set', patch: { mode: 'needsHousehold', lists, hasSignupProfile: !!profile } });
      return false;
    }
    const same = membership.householdId === state.householdId;
    dispatch({
      type: 'replace',
      state: {
        ...liveState(membership, same ? state.items : [], lists),
        // Same list: keep what's going on (a trip, questions, who's shopping, a summary being shown)
        ...(same
          ? {
              inviteCode: state.inviteCode,
              trip: state.trip,
              questions: state.questions,
              activeTrips: state.activeTrips,
              summary: state.summary,
            }
          : { inviteCode: null }),
        toast: welcome ? { id: ++toastCounter, message: welcome } : null,
      },
    });
    return true;
  };

  return {
    items: state.items,
    toast: state.toast,
    currentMemberId: me,
    trip,
    questions: state.questions,
    summary: state.summary,
    offline: state.offline,
    pendingSync: state.pendingSync,
    members: state.members,
    invites: state.invites,
    householdName: state.householdName,
    settings: state.settings,
    mode: state.mode,
    householdId: state.householdId,
    inviteCode: state.inviteCode,
    lists: state.lists,
    hasSignupProfile: state.hasSignupProfile,
    activeTrips: state.activeTrips,
    otherShopperId,
    // Who the list's banner shows as shopping: me during my trip, otherwise someone else
    currentShopperId: trip ? me : otherShopperId,
    // A trip by id — mine or someone else's (for «في السوبرماركت الحين» on a question)
    tripStore(tripId: string): StoreKey | null {
      if (trip?.id === tripId) return trip.store;
      return state.activeTrips.find((tr) => tr.id === tripId)?.store ?? null;
    },
    everyone,
    memberById,

    // Open item with this name (ignores أ/ا, ة/ه spelling differences)
    findOpenByName: openItemNamed,

    // `message` lets a screen in another language (the helper's) word the toast itself
    markBought(id: string, message?: string) {
      const item = find(id);
      if (!item) return;
      patchItem(id, { status: 'bought' });
      showToast(message ?? t('toast.bought', { name: item.name }), undoFor(item));
    },

    removeItem(id: string) {
      const item = find(id);
      if (!item) return;
      patchItem(id, { status: 'removed' });
      const adder = memberById(item.added_by);
      const message =
        adder && adder.id !== me
          ? t(`toast.removedSeen_${adder.gender}`, { name: item.name, who: adder.display_name })
          : t('toast.removed', { name: item.name });
      showToast(message, undoFor(item));
    },

    toggleClaim(id: string) {
      const item = find(id);
      if (!item) return;
      const claiming = item.claimed_by !== me;
      patchItem(id, { claimed_by: claiming ? me : null });
      showToast(t(claiming ? 'toast.claimed' : 'toast.unclaimed', { name: item.name }), undoFor(item));
    },

    saveItem(id: string, patch: Pick<Item, 'qty' | 'unit' | 'note'>) {
      const item = find(id);
      if (!item) return;
      patchItem(id, patch);
      showToast(t('toast.saved', { name: item.name }), undoFor(item));
    },

    // Add one or more items. If an item is already on the list, its quantity goes up instead
    // of creating a duplicate. Shows one toast with undo for the whole batch.
    addItems(drafts: ItemDraft[]) {
      const undo: Undo = { restore: [], discard: [] };
      const fresh: Item[] = [];
      let lastMessage = '';

      for (const draft of drafts) {
        const existing = openItemNamed(draft.name);
        if (existing) {
          const qty = existing.qty + draft.qty;
          const requested_by = existing.requested_by.includes(me) ? existing.requested_by : [...existing.requested_by, me];
          patchItem(existing.id, { qty, requested_by });
          undo.restore.push(existing);
          lastMessage = t('toast.addedMore', { name: existing.name, qty: formatQuantity(qty, existing.unit) });
        } else {
          const item = newItem(draft, me);
          fresh.push(item);
          undo.discard.push(item.id);
          lastMessage = t('toast.added', { name: item.name });
        }
      }

      addNewItems(fresh);
      if (drafts.length === 0) return;
      showToast(drafts.length === 1 ? lastMessage : t('toast.addedMany', { n: drafts.length }), undo);
    },

    // Apply a reviewed recording in one go, with one undo for all of it
    applyVoice(changes: ListChange[], transcript: string) {
      if (changes.length === 0) return;
      const undo: Undo = { restore: [], discard: [] };
      const fresh: Item[] = [];

      for (const change of changes) {
        if (change.kind === 'patch') {
          const item = find(change.id);
          if (!item) continue;
          patchItem(change.id, change.patch);
          undo.restore.push(item);
        } else {
          const item = newItem(change.draft, me, transcript);
          fresh.push(item);
          undo.discard.push(item.id);
        }
      }

      addNewItems(fresh);
      showToast(t('toast.voiceApplied', { n: changes.length }), undo);
    },

    // Quick add (empty-state basics) — no toast; returns the id so it can be taken back
    addBasic(basic: Basic): string {
      const item = newItem(basic, me);
      addNewItems([item]);
      return item.id;
    },

    // Take back a quick add — it never really happened, so no undo needed
    discardItem(id: string) {
      discardItems([id]);
    },

    undo() {
      const undo = state.toast?.undo;
      if (!undo) return;
      dispatch({ type: 'undo', undo });
      // Live: put the items back as they were, take back fresh additions
      if (live) {
        for (const before of undo.restore) api.updateItem(before.id, before).catch(itemsFailed);
        for (const id of undo.discard) api.updateItem(id, { status: 'removed' }).catch(itemsFailed);
      }
      // Live family changes are undone in the database too
      if (live && undo.members) {
        for (const before of undo.members) {
          const now = state.members.find((m) => m.id === before.id);
          if (!now) api.restoreMember(before.id).catch(failed);
          else if (
            now.view_language !== before.view_language ||
            now.dialect !== before.dialect ||
            now.speaks.join() !== before.speaks.join()
          ) {
            api
              .updateMember(before.id, {
                view_language: before.view_language,
                speaks: before.speaks,
                dialect: before.dialect,
              })
              .catch(failed);
          }
        }
      }
    },

    notify(message: string) {
      showToast(message);
    },

    dismissToast() {
      dispatch({ type: 'toast', toast: null });
    },

    // --- Shopping trips -------------------------------------------------------

    startTrip(store: StoreKey, mode: Trip['mode']) {
      const open = state.items.filter((i) => i.status === 'open');
      const partnerId = mode === 'split' ? otherShopperId : null;
      const id = live ? api.newItemId() : newId('trip');
      const startedAt = new Date().toISOString();
      if (live && state.householdId) {
        api.startTrip(state.householdId, { id, shopperId: me, store, mode, partnerId, startedAt }).catch(itemsFailed);
      }

      // Simulated split (demo only): the partner already took the dairy aisle and found one thing; produce is yours
      if (partnerId && !live) {
        let partnerFoundOne = false;
        for (const item of open) {
          if (item.category === 'produce') patchItem(item.id, { claimed_by: me });
          if (item.category === 'dairy') {
            dispatch({
              type: 'patch',
              id: item.id,
              patch: { claimed_by: partnerId, status: partnerFoundOne ? 'open' : 'in_cart' },
            });
            partnerFoundOne = true;
          }
        }
      }

      dispatch({
        type: 'set',
        patch: {
          trip: {
            id,
            store,
            shopperId: me,
            startedAt,
            mode,
            partnerId,
            itemIds: open.map((i) => i.id),
            addedIds: [],
            skippedIds: [],
            outcomes: [],
          },
          summary: null,
          pendingSync: [],
        },
      });
    },

    toggleCart(id: string) {
      const item = find(id);
      if (!item) return;
      const toCart = item.status === 'open';
      patchItem(id, { status: toCart ? 'in_cart' : 'open' });
      if (state.offline) {
        dispatch({
          type: 'set',
          patch: { pendingSync: toCart ? [...state.pendingSync, id] : state.pendingSync.filter((p) => p !== id) },
        });
      }
    },

    // Split mode: take an unclaimed item
    claimForTrip(id: string) {
      const item = find(id);
      if (!item) return;
      patchItem(id, { claimed_by: me });
      showToast(t('toast.claimedTrip', { name: item.name }), undoFor(item));
    },

    // The shopper couldn't find something
    notFound(id: string, choice: 'ask' | 'next' | 'remove', askTo: string | null) {
      const item = find(id);
      if (!item || !trip) return;

      if (choice === 'remove') {
        patchItem(id, { status: 'removed' });
        dispatch({ type: 'trip', patch: { outcomes: withOutcome(trip.outcomes, outcome(item, 'removed')) } });
        showToast(t('toast.removed', { name: item.name }), undoFor(item));
        return;
      }

      const skippedIds = [...trip.skippedIds.filter((s) => s !== id), id];
      if (choice === 'next') {
        dispatch({ type: 'trip', patch: { skippedIds, outcomes: withOutcome(trip.outcomes, outcome(item, 'next')) } });
        showToast(t('toast.skipped', { name: item.name }));
        return;
      }

      if (!askTo) return;
      const altId = findCatalogMatch(item.name)?.alternative;
      const question: Question = {
        id: newId('q'),
        tripId: trip.id,
        itemId: id,
        from: me,
        to: askTo,
        createdAt: new Date().toISOString(),
        altName: (altId && catalogById(altId)?.name) || null,
        answer: null,
      };
      if (live && state.householdId) {
        question.id = api.newItemId();
        api.askQuestion(state.householdId, question).catch(itemsFailed);
      }
      dispatch({ type: 'trip', patch: { skippedIds, outcomes: withOutcome(trip.outcomes, outcome(item, 'asked')) } });
      dispatch({ type: 'set', patch: { questions: [...state.questions, question] } });
      showToast(t('toast.questionSent', { name: memberById(askTo)?.display_name ?? '' }));
    },

    // Simulated: whoever is shopping can't find cardamom and asks me (the notifications screen).
    // Puts cardamom on the list as mine if it isn't there. Returns the question id.
    receiveQuestion(): string | null {
      const shopper = state.members.find((m) => m.id === activeShopperId && m.id !== me);
      const cardamom = catalogById('c20');
      if (!shopper || !cardamom) return null;
      // Only once per demo session — after you reply, the card stays gone
      const asked = state.questions.find((q) => q.from === shopper.id && q.to === me);
      if (asked) return asked.id;

      let item = openItemNamed(cardamom.name);
      if (!item) {
        item = {
          ...newItem(catalogToDraft(cardamom), me),
          created_at: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
        };
        dispatch({ type: 'add', items: [item] });
      }
      const altId = cardamom.alternative;
      const question: Question = {
        id: newId('q'),
        tripId: 'shopper-trip', // the other person's trip — not tracked on this phone
        itemId: item.id,
        from: shopper.id,
        to: me,
        createdAt: new Date().toISOString(),
        altName: (altId && catalogById(altId)?.name) || null,
        answer: null,
      };
      dispatch({ type: 'set', patch: { questions: [...state.questions, question] } });
      return question.id;
    },

    // The family member replies (simulated on this phone)
    answerQuestion(questionId: string, answer: QuestionAnswer, reply: string) {
      const question = state.questions.find((q) => q.id === questionId);
      const item = question && find(question.itemId);
      if (!question || !item) return;

      dispatch({
        type: 'set',
        patch: { questions: state.questions.map((q) => (q.id === questionId ? { ...q, answer, reply } : q)) },
      });
      if (live) api.answerQuestion(questionId, answer, reply).catch(itemsFailed);

      if (trip && trip.id === question.tripId) {
        const answered = { answeredBy: question.to, reply };
        if (answer === 'alt') {
          // Back on the shopping list, as the replacement
          const altName = question.altName ?? item.name;
          patchItem(item.id, { name: altName });
          dispatch({
            type: 'trip',
            patch: {
              skippedIds: trip.skippedIds.filter((s) => s !== item.id),
              outcomes: withOutcome(trip.outcomes, outcome(item, 'swapped', { ...answered, alt: altName })),
            },
          });
        } else if (answer === 'no') {
          patchItem(item.id, { status: 'removed' });
          dispatch({
            type: 'trip',
            patch: { outcomes: withOutcome(trip.outcomes, outcome(item, 'removed', answered)) },
          });
        } else {
          dispatch({ type: 'trip', patch: { outcomes: withOutcome(trip.outcomes, outcome(item, 'next', answered)) } });
        }
      } else if (answer === 'alt' && question.altName) {
        // Someone else's trip (e.g. replying from a notification): just update the list
        patchItem(item.id, { name: question.altName });
      } else if (answer === 'no') {
        patchItem(item.id, { status: 'removed' });
      }

      showToast(t('toast.answerSent', { name: memberById(question.from)?.display_name ?? '' }));
    },

    // End the trip: cart → bought; anything left stays on the list
    finishTrip(handoff: boolean) {
      if (!trip) return;
      const tripItems = state.items.filter((i) => trip.itemIds.includes(i.id));
      const inCart = tripItems.filter((i) => i.status === 'in_cart');
      // In a split trip, what the partner bought isn't counted as mine
      const mine = trip.partnerId ? inCart.filter((i) => i.claimed_by !== trip.partnerId) : inCart;

      for (const item of tripItems) {
        if (item.status === 'in_cart')
          patchItem(item.id, { status: 'bought', claimed_by: null });
        else if (item.claimed_by === me) patchItem(item.id, { claimed_by: null });
      }

      if (live) api.endTrip(trip.id, handoff).catch(itemsFailed);
      const summary: TripSummary = {
        tripId: trip.id,
        shopperId: trip.shopperId,
        store: trip.store,
        startedAt: trip.startedAt,
        endedAt: new Date().toISOString(),
        boughtCount: mine.length,
        notFound: trip.outcomes,
        added: tripItems
          .filter((i) => trip.addedIds.includes(i.id))
          .map((i) => ({ name: i.name, bought: i.status === 'in_cart' })),
      };
      dispatch({ type: 'set', patch: { trip: null, summary, offline: false, pendingSync: [] } });
      if (handoff) showToast(t('toast.handoff'));
    },

    // Leave shopping mode without a summary (nothing was bought)
    leaveTrip() {
      if (live && trip) api.endTrip(trip.id).catch(itemsFailed);
      dispatch({ type: 'set', patch: { trip: null, offline: false, pendingSync: [] } });
    },

    // «دفعت كم؟» on the trip summary (live lists only)
    saveTripAmount(amount: number) {
      if (live && state.summary?.tripId && amount > 0) api.saveTripAmount(state.summary.tripId, amount).catch(itemsFailed);
    },

    clearSummary() {
      dispatch({ type: 'set', patch: { summary: null } });
    },

    setOffline(offline: boolean) {
      dispatch({ type: 'set', patch: { offline, pendingSync: offline ? state.pendingSync : [] } });
      showToast(t(offline ? 'toast.offlineOn' : 'toast.synced'));
    },

    // --- Family -----------------------------------------------------------------

    // Save a member's role and languages. Making someone the manager hands it over:
    // the current manager becomes a member.
    updateMember(
      id: string,
      patch: Partial<Pick<Member, 'role' | 'view_language' | 'speaks' | 'dialect'>>,
      silent = false,
    ) {
      const member = memberById(id);
      if (!member) return;
      const undo = familyUndo();
      const handover = patch.role === 'owner' && member.role !== 'owner';
      const next = state.members.map((m) => {
        if (m.id === id) return { ...m, ...patch };
        if (handover && m.role === 'owner') return { ...m, role: 'member' as const };
        return m;
      });
      dispatch({ type: 'set', patch: { members: next } });

      if (live) {
        const { role, ...profile } = patch;
        const roleChanged = role !== undefined && role !== member.role;
        Promise.all([
          Object.keys(profile).length > 0 ? api.updateMember(id, profile) : null,
          roleChanged ? api.setMemberRole(id, role) : null,
        ]).catch(failed);
        // A role change (above all a hand-over) can't be undone from here
        if (!silent) showToast(t('toast.memberSaved', { name: member.display_name }), roleChanged ? undefined : undo);
        return;
      }
      if (!silent) showToast(t('toast.memberSaved', { name: member.display_name }), undo);
    },

    // My own profile (name, «أنا», color, dialect, languages) — no undo, just saved
    updateProfile(patch: api.ProfilePatch) {
      const member = memberById(me);
      if (!member) return;
      const name = patch.display_name?.trim();
      const next = { ...member, ...patch, ...(name ? { display_name: name, initial: name.charAt(0) } : {}) };
      dispatch({ type: 'set', patch: { members: state.members.map((m) => (m.id === me ? next : m)) } });
      if (live) api.updateMember(me, name ? { ...patch, display_name: name } : patch).catch(failed);
      showToast(t('toast.profileSaved'));
    },

    removeMember(id: string) {
      const member = memberById(id);
      if (!member || id === me) return;
      const undo = familyUndo();
      dispatch({
        type: 'set',
        patch: {
          members: state.members.filter((m) => m.id !== id),
          formerMembers: live ? [...state.formerMembers, member] : state.formerMembers,
        },
      });
      if (live) api.removeMember(id).catch(failed);
      showToast(t('toast.memberRemoved', { name: member.display_name }), undo);
    },

    setHouseholdName(name: string) {
      const trimmed = name.trim();
      if (!trimmed || trimmed === state.householdName) return;
      dispatch({ type: 'set', patch: { householdName: trimmed } });
      if (live && state.householdId) api.renameHousehold(state.householdId, trimmed).catch(failed);
      showToast(t('toast.listRenamed', { name: trimmed }));
    },

    setSetting(key: keyof HouseholdSettings, value: boolean) {
      const settings = { ...state.settings, [key]: value };
      dispatch({ type: 'set', patch: { settings } });
      if (live) api.updateMember(me, { settings }).catch(failed);
    },

    // --- Sign-in and households ---------------------------------------------------

    refreshHousehold,

    // Open another of my lists
    async switchList(householdId: string) {
      if (householdId === state.householdId || !live) return;
      try {
        await api.rememberHousehold(householdId);
        await refreshHousehold(undefined, householdId);
      } catch (error) {
        failed(error);
      }
    },

    // This household's invite code (reuses a valid one)
    async ensureInviteCode(): Promise<string | null> {
      if (state.inviteCode) return state.inviteCode;
      if (!state.householdId) return null;
      try {
        const code = await api.getOrCreateInvite(state.householdId);
        dispatch({ type: 'set', patch: { inviteCode: code } });
        return code;
      } catch (error) {
        failed(error);
        return null;
      }
    },

    // The fake household from earlier sessions, for trying screens without an account
    enterDemo() {
      dispatch({ type: 'replace', state: demoState() });
    },

    async signOut() {
      if (live) await api.signOut().catch(failed);
      dispatch({ type: 'replace', state: initialState('signedOut') });
    },

    // Dev-only helpers to see the empty state and come back
    clearAll() {
      if (live) dispatch({ type: 'set', patch: { trip: null, summary: null } });
      if (live) dispatch({ type: 'discard', ids: state.items.map((i) => i.id) });
      else dispatch({ type: 'reset', items: [] });
    },
    loadDemo() {
      dispatch({ type: 'reset', items: makeDemoItems() });
    },
  };
}

type ListStore = ReturnType<typeof useListState>;

const ListContext = createContext<ListStore | null>(null);

export function ListProvider({ children }: { children: ReactNode }) {
  const store = useListState();
  return <ListContext.Provider value={store}>{children}</ListContext.Provider>;
}

export function useList(): ListStore {
  const store = useContext(ListContext);
  if (!store) throw new Error('useList must be used inside <ListProvider>');
  return store;
}
