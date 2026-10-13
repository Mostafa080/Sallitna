// Shopping trips — mirrors the planned `trips` and `questions` tables.

import type { StoreKey } from '@/data/fakeHousehold';

// What happened to something the shopper couldn't find
export type NotFoundDecision = 'asked' | 'next' | 'removed' | 'swapped';

export type TripOutcome = {
  itemId: string;
  name: string;
  decision: NotFoundDecision;
  alt?: string; // what was bought instead
  answeredBy?: string; // member id, when the family replied
  reply?: string; // the reply they picked
};

export type Trip = {
  id: string;
  store: StoreKey;
  shopperId: string;
  startedAt: string;
  mode: 'solo' | 'split';
  partnerId: string | null;
  itemIds: string[]; // everything that was on the list during the trip
  addedIds: string[]; // added by the family while shopping
  skippedIds: string[]; // not found — waiting for a reply or left for next time
  outcomes: TripOutcome[];
};

export type QuestionAnswer = 'alt' | 'no' | 'next';

export type Question = {
  id: string;
  tripId: string;
  itemId: string;
  from: string; // shopper
  to: string; // member who added the item
  createdAt: string;
  altName: string | null; // suggested replacement, if the catalog knows one
  answer: QuestionAnswer | null;
};

export type TripSummary = {
  shopperId: string;
  store: StoreKey;
  startedAt: string;
  endedAt: string;
  boughtCount: number;
  notFound: TripOutcome[];
  added: { name: string; bought: boolean }[];
};
