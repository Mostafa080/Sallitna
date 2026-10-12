// The household list, shared by every screen.
// In-memory for now (resets on reload). Later this is backed by Supabase + Realtime,
// and undo maps to item_events.

import { createContext, useContext, useReducer, type ReactNode } from 'react';

import {
  currentMemberId,
  makeDemoItems,
  members,
  type Basic,
  type Item,
  type ItemDraft,
} from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { normalizeArabic } from '@/lib/arabic';
import { formatQuantity } from '@/lib/format';
import type { ListChange } from '@/lib/voiceReview';

// What "undo" reverses: items to put back as they were, and newly added items to take away
export type Undo = {
  restore: Item[];
  discard: string[];
};

export type Toast = {
  id: number;
  message: string;
  undo?: Undo;
};

type State = {
  items: Item[];
  toast: Toast | null;
};

type Action =
  | { type: 'patch'; id: string; patch: Partial<Item> }
  | { type: 'add'; items: Item[] }
  | { type: 'discard'; ids: string[] }
  | { type: 'undo'; undo: Undo }
  | { type: 'reset'; items: Item[] }
  | { type: 'toast'; toast: Toast | null };

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
        items: state.items
          .filter((item) => !action.undo.discard.includes(item.id))
          .map((item) => byId.get(item.id) ?? item),
        toast: null,
      };
    }
    case 'reset':
      return { items: action.items, toast: null };
    case 'toast':
      return { ...state, toast: action.toast };
  }
}

let toastCounter = 0;
let idCounter = 0;

const sameName = (a: string, b: string) => normalizeArabic(a) === normalizeArabic(b);

function newItem(draft: ItemDraft, voiceTranscript?: string): Item {
  return {
    ...draft,
    id: `local-${Date.now()}-${++idCounter}`,
    status: 'open',
    note: '',
    added_by: currentMemberId,
    added_via: voiceTranscript ? 'voice' : 'text',
    voice_transcript: voiceTranscript,
    requested_by: [currentMemberId],
    claimed_by: null,
    created_at: new Date().toISOString(),
  };
}

function useListState() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ items: makeDemoItems(), toast: null }));

  const find = (id: string) => state.items.find((item) => item.id === id);
  const memberById = (id: string) => members.find((m) => m.id === id);
  const openItemNamed = (name: string) =>
    state.items.find((item) => item.status === 'open' && sameName(item.name, name));

  const showToast = (message: string, undo?: Undo) =>
    dispatch({ type: 'toast', toast: { id: ++toastCounter, message, undo } });

  const undoFor = (item: Item): Undo => ({ restore: [item], discard: [] });

  return {
    items: state.items,
    toast: state.toast,
    currentMemberId,

    // Open item with this name (ignores أ/ا, ة/ه spelling differences)
    findOpenByName: openItemNamed,

    markBought(id: string) {
      const item = find(id);
      if (!item) return;
      dispatch({ type: 'patch', id, patch: { status: 'bought' } });
      showToast(t('toast.bought', { name: item.name }), undoFor(item));
    },

    removeItem(id: string) {
      const item = find(id);
      if (!item) return;
      dispatch({ type: 'patch', id, patch: { status: 'removed' } });
      const adder = memberById(item.added_by);
      const message =
        adder && adder.id !== currentMemberId
          ? t(`toast.removedSeen_${adder.gender}`, { name: item.name, who: adder.display_name })
          : t('toast.removed', { name: item.name });
      showToast(message, undoFor(item));
    },

    toggleClaim(id: string) {
      const item = find(id);
      if (!item) return;
      const claiming = item.claimed_by !== currentMemberId;
      dispatch({ type: 'patch', id, patch: { claimed_by: claiming ? currentMemberId : null } });
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
          const item = newItem(draft);
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
          const item = newItem(change.draft, transcript);
          fresh.push(item);
          undo.discard.push(item.id);
        }
      }

      if (fresh.length > 0) dispatch({ type: 'add', items: fresh });
      showToast(t('toast.voiceApplied', { n: changes.length }), undo);
    },

    // Quick add (empty-state basics) — no toast; returns the id so it can be taken back
    addBasic(basic: Basic): string {
      const item = newItem(basic);
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
