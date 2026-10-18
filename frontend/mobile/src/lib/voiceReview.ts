// Turns what we understood from a recording into review cards (checked against the
// current list), and the reviewed cards back into list changes.

import { catalogById, catalogToDraft, findCatalogMatch } from '@/data/fakeCatalog';
import type { Item, ItemDraft } from '@/data/fakeHousehold';
import type { VoiceIntent } from '@/data/fakeVoice';

export type ReviewOp =
  | { kind: 'update'; key: string; item: Item; qty: number }
  | { kind: 'add'; key: string; draft: ItemDraft }
  | { kind: 'confirm'; key: string; word: string; options: ItemDraft[]; choice: number }
  | { kind: 'remove'; key: string; item: Item; keep: boolean };

// One change to the list: either change an existing item, or add a new one
export type ListChange = { kind: 'patch'; id: string; patch: Partial<Item> } | { kind: 'add'; draft: ItemDraft };

type FindOpen = (name: string) => Item | undefined;

function draftFor(text: string, qty: number, unit?: Item['unit']): ItemDraft {
  const match = findCatalogMatch(text);
  return match ? catalogToDraft(match, qty, unit) : { name: text, qty, unit: unit ?? 'count', category: 'other' };
}

export function buildReview(intents: VoiceIntent[], findOpen: FindOpen): ReviewOp[] {
  const ops: ReviewOp[] = [];

  intents.forEach((intent, index) => {
    const key = `op-${index}`;

    if (intent.type === 'want') {
      const draft = draftFor(intent.text, intent.qty, intent.unit);
      const existing = findOpen(draft.name);
      ops.push(existing ? { kind: 'update', key, item: existing, qty: draft.qty } : { kind: 'add', key, draft });
    }

    if (intent.type === 'ambiguous') {
      const options = intent.options
        .map(catalogById)
        .filter((c) => c !== undefined)
        .map((c) => catalogToDraft(c));
      if (options.length > 0) ops.push({ kind: 'confirm', key, word: intent.word, options, choice: 0 });
    }

    if (intent.type === 'remove') {
      // Only offer to remove something that's actually on the list
      const match = findCatalogMatch(intent.text);
      const existing = findOpen(match?.name ?? intent.text);
      if (existing) ops.push({ kind: 'remove', key, item: existing, keep: false });
    }
  });

  return ops;
}

export function toChanges(ops: ReviewOp[], findOpen: FindOpen, memberId: string): ListChange[] {
  const changes: ListChange[] = [];

  // Setting a quantity on an existing item also records that this person asked for it
  const patchQty = (item: Item, qty: number): ListChange => ({
    kind: 'patch',
    id: item.id,
    patch: {
      qty,
      requested_by: item.requested_by.includes(memberId) ? item.requested_by : [...item.requested_by, memberId],
    },
  });

  for (const op of ops) {
    if (op.kind === 'update') changes.push(patchQty(op.item, op.qty));
    if (op.kind === 'add') changes.push({ kind: 'add', draft: op.draft });
    if (op.kind === 'remove' && !op.keep) changes.push({ kind: 'patch', id: op.item.id, patch: { status: 'removed' } });
    if (op.kind === 'confirm') {
      const draft = op.options[op.choice];
      const existing = findOpen(draft.name);
      changes.push(existing ? patchQty(existing, draft.qty) : { kind: 'add', draft });
    }
  }

  return changes;
}
