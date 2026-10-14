// The household list, shared by every screen.
// In-memory for now (resets on reload). Later this is backed by Supabase + Realtime,
// and undo maps to item_events.

import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';

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
import { normalizeArabic } from '@/lib/arabic';
import { formatQuantity } from '@/lib/format';
import type { ListChange } from '@/lib/voiceReview';
import type { Question, QuestionAnswer, Trip, TripOutcome, TripSummary } from '@/store/tripTypes';

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
};

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
  | { type: 'replace'; state: State };

function initialState(): State {
  return {
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
  };
}

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
      return { ...initialState(), items: action.items };
    case 'toast':
      return { ...state, toast: action.toast };
    case 'set':
      return { ...state, ...action.patch };
    case 'trip':
      return state.trip ? { ...state, trip: { ...state.trip, ...action.patch } } : state;
    case 'replace':
      return action.state;
    case 'liveAdd':
      // Only while still shopping, and only once
      if (!state.trip || state.items.some((i) => i.status === 'open' && sameName(i.name, action.item.name))) return state;
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

let toastCounter = 0;
let idCounter = 0;

const sameName = (a: string, b: string) => normalizeArabic(a) === normalizeArabic(b);

const newId = (prefix: string) => `${prefix}-${Date.now()}-${++idCounter}`;

function newItem(draft: ItemDraft, addedBy: string, voiceTranscript?: string): Item {
  return {
    ...draft,
    id: newId('local'),
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
  viewLanguage?: LanguageKey;
};

function newMember(id: string, p: NewProfile, role: Member['role'], color: Member['avatar_color']): Member {
  const name = p.displayName.trim();
  const language = p.viewLanguage ?? 'ar';
  return {
    id,
    display_name: name,
    initial: name.charAt(0),
    gender: p.gender,
    role,
    avatar_color: color,
    view_language: language,
    speaks: [language],
    dialect: p.dialect,
    joined_at: new Date().toISOString(),
    items_added: 0,
  };
}

function useListState() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const { trip } = state;
  const me = state.meId;

  // Simulated family: a few seconds into a trip, someone adds an item by voice
  useEffect(() => {
    if (!trip) return;
    const timer = setTimeout(() => {
      const cardamom = catalogById('c20');
      if (!cardamom) return;
      const adder = demoMembers.find((m) => m.id === liveAdderId);
      dispatch({ type: 'liveAdd', item: newItem(catalogToDraft(cardamom), liveAdderId, 'هيل كيس') });
      if (adder) {
        dispatch({
          type: 'toast',
          toast: { id: ++toastCounter, message: t(`toast.liveAdded_${adder.gender}`, { name: adder.display_name, item: cardamom.name }) },
        });
      }
    }, LIVE_ADD_DELAY_MS);
    return () => clearTimeout(timer);
    // Once per trip
  }, [trip?.id]);

  const find = (id: string) => state.items.find((item) => item.id === id);
  // Removed members still resolve, so old items keep showing who added them
  const memberById = (id: string) => state.members.find((m) => m.id === id) ?? demoMembers.find((m) => m.id === id);
  const familyUndo = (): Undo => ({ restore: [], discard: [], members: state.members });
  // Everyone who ever added something here — removed members too, so old items keep their names
  const everyone = [...state.members, ...demoMembers.filter((d) => !state.members.some((m) => m.id === d.id))];
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
    everyone,
    memberById,

    // Open item with this name (ignores أ/ا, ة/ه spelling differences)
    findOpenByName: openItemNamed,

    // `message` lets a screen in another language (the helper's) word the toast itself
    markBought(id: string, message?: string) {
      const item = find(id);
      if (!item) return;
      dispatch({ type: 'patch', id, patch: { status: 'bought' } });
      showToast(message ?? t('toast.bought', { name: item.name }), undoFor(item));
    },

    removeItem(id: string) {
      const item = find(id);
      if (!item) return;
      dispatch({ type: 'patch', id, patch: { status: 'removed' } });
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
      dispatch({ type: 'patch', id, patch: { claimed_by: claiming ? me : null } });
      showToast(t(claiming ? 'toast.claimed' : 'toast.unclaimed', { name: item.name }), undoFor(item));
    },

    saveItem(id: string, patch: Pick<Item, 'qty' | 'unit' | 'note'>) {
      const item = find(id);
      if (!item) return;
      dispatch({ type: 'patch', id, patch });
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
          dispatch({ type: 'patch', id: existing.id, patch: { qty } });
          undo.restore.push(existing);
          lastMessage = t('toast.addedMore', { name: existing.name, qty: formatQuantity(qty, existing.unit) });
        } else {
          const item = newItem(draft, me);
          fresh.push(item);
          undo.discard.push(item.id);
          lastMessage = t('toast.added', { name: item.name });
        }
      }

      if (fresh.length > 0) dispatch({ type: 'add', items: fresh });
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
          dispatch({ type: 'patch', id: change.id, patch: change.patch });
          undo.restore.push(item);
        } else {
          const item = newItem(change.draft, me, transcript);
          fresh.push(item);
          undo.discard.push(item.id);
        }
      }

      if (fresh.length > 0) dispatch({ type: 'add', items: fresh });
      showToast(t('toast.voiceApplied', { n: changes.length }), undo);
    },

    // Quick add (empty-state basics) — no toast; returns the id so it can be taken back
    addBasic(basic: Basic): string {
      const item = newItem(basic, me);
      dispatch({ type: 'add', items: [item] });
      return item.id;
    },

    // Take back a quick add — it never really happened, so no undo needed
    discardItem(id: string) {
      dispatch({ type: 'discard', ids: [id] });
    },

    undo() {
      if (state.toast?.undo) dispatch({ type: 'undo', undo: state.toast.undo });
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
      const partnerId = mode === 'split' ? activeShopperId : null;

      // Simulated split: the partner already took the dairy aisle and found one thing; produce is yours
      if (partnerId) {
        let partnerFoundOne = false;
        for (const item of open) {
          if (item.category === 'produce') dispatch({ type: 'patch', id: item.id, patch: { claimed_by: me } });
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
            id: newId('trip'),
            store,
            shopperId: me,
            startedAt: new Date().toISOString(),
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
      dispatch({ type: 'patch', id, patch: { status: toCart ? 'in_cart' : 'open' } });
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
      dispatch({ type: 'patch', id, patch: { claimed_by: me } });
      showToast(t('toast.claimedTrip', { name: item.name }), undoFor(item));
    },

    // The shopper couldn't find something
    notFound(id: string, choice: 'ask' | 'next' | 'remove', askTo: string | null) {
      const item = find(id);
      if (!item || !trip) return;

      if (choice === 'remove') {
        dispatch({ type: 'patch', id, patch: { status: 'removed' } });
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
        item = { ...newItem(catalogToDraft(cardamom), me), created_at: new Date(Date.now() - 3 * 60 * 60_000).toISOString() };
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
        patch: { questions: state.questions.map((q) => (q.id === questionId ? { ...q, answer } : q)) },
      });

      if (trip && trip.id === question.tripId) {
        const answered = { answeredBy: question.to, reply };
        if (answer === 'alt') {
          // Back on the shopping list, as the replacement
          const altName = question.altName ?? item.name;
          dispatch({ type: 'patch', id: item.id, patch: { name: altName } });
          dispatch({
            type: 'trip',
            patch: {
              skippedIds: trip.skippedIds.filter((s) => s !== item.id),
              outcomes: withOutcome(trip.outcomes, outcome(item, 'swapped', { ...answered, alt: altName })),
            },
          });
        } else if (answer === 'no') {
          dispatch({ type: 'patch', id: item.id, patch: { status: 'removed' } });
          dispatch({ type: 'trip', patch: { outcomes: withOutcome(trip.outcomes, outcome(item, 'removed', answered)) } });
        } else {
          dispatch({ type: 'trip', patch: { outcomes: withOutcome(trip.outcomes, outcome(item, 'next', answered)) } });
        }
      } else if (answer === 'alt' && question.altName) {
        // Someone else's trip (e.g. replying from a notification): just update the list
        dispatch({ type: 'patch', id: item.id, patch: { name: question.altName } });
      } else if (answer === 'no') {
        dispatch({ type: 'patch', id: item.id, patch: { status: 'removed' } });
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
        if (item.status === 'in_cart') dispatch({ type: 'patch', id: item.id, patch: { status: 'bought', claimed_by: null } });
        else if (item.claimed_by === me) dispatch({ type: 'patch', id: item.id, patch: { claimed_by: null } });
      }

      const summary: TripSummary = {
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
      dispatch({ type: 'set', patch: { trip: null, offline: false, pendingSync: [] } });
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
    updateMember(id: string, patch: Partial<Pick<Member, 'role' | 'view_language' | 'speaks' | 'dialect'>>, silent = false) {
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
      if (!silent) showToast(t('toast.memberSaved', { name: member.display_name }), undo);
    },

    removeMember(id: string) {
      const member = memberById(id);
      if (!member || id === me) return;
      const undo = familyUndo();
      dispatch({ type: 'set', patch: { members: state.members.filter((m) => m.id !== id) } });
      showToast(t('toast.memberRemoved', { name: member.display_name }), undo);
    },

    setHouseholdName(name: string) {
      const trimmed = name.trim();
      if (!trimmed || trimmed === state.householdName) return;
      dispatch({ type: 'set', patch: { householdName: trimmed } });
      showToast(t('toast.listRenamed', { name: trimmed }));
    },

    setSetting(key: keyof HouseholdSettings, value: boolean) {
      dispatch({ type: 'set', patch: { settings: { ...state.settings, [key]: value } } });
    },

    // --- Sign-up (simulated) ------------------------------------------------------

    // A brand-new household: just me, as manager, with an empty list
    createHousehold(profile: NewProfile & { householdName: string }) {
      const id = newId('member');
      dispatch({
        type: 'replace',
        state: {
          ...initialState(),
          items: [],
          members: [newMember(id, profile, 'owner', 'ink')],
          invites: [],
          householdName: profile.householdName.trim(),
          meId: id,
        },
      });
    },

    // Join the demo household from an invite, as a new member
    joinHousehold(profile: NewProfile) {
      const id = newId('member');
      const fresh = initialState();
      dispatch({
        type: 'replace',
        state: {
          ...fresh,
          members: [...fresh.members, newMember(id, profile, 'member', 'success')],
          meId: id,
          toast: {
            id: ++toastCounter,
            message: t('toast.joined', { name: profile.displayName.trim(), list: fresh.householdName }),
          },
        },
      });
    },

    // Dev-only helpers to see the empty state and come back
    clearAll() {
      dispatch({ type: 'reset', items: [] });
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
