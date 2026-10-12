// Simulated voice input until real speech-to-text exists (Supabase Edge Function).
// Mirrors what a `voice_jobs` row will hold: the transcript and what we understood from it.

import type { Unit } from '@/data/fakeHousehold';

// How a phrase is marked while listening: understood item, waiting for more context, or plain speech
export type PhraseKind = 'item' | 'pending' | 'plain';

export type Phrase = { text: string; kind: PhraseKind };

// What the person said, revealed one phrase at a time
export const demoTranscript: Phrase[] = [
  { text: 'نبي ', kind: 'plain' },
  { text: 'حليب ثنتين', kind: 'item' },
  { text: '، و', kind: 'plain' },
  { text: 'كيس خبز صامولي', kind: 'item' },
  { text: '، و', kind: 'plain' },
  { text: 'عيش', kind: 'item' },
  { text: '… و', kind: 'plain' },
  { text: 'شيل', kind: 'pending' },
  { text: ' ', kind: 'plain' },
  { text: 'المناديل', kind: 'item' },
  { text: ' احنا شارينها', kind: 'plain' },
];

export const demoDurationSeconds = 7;

// What we understood. `text` is matched against the catalog (dialect aliases included).
export type VoiceIntent =
  | { type: 'want'; text: string; qty: number; unit?: Unit }
  | { type: 'ambiguous'; word: string; options: string[] } // catalog ids, first = our best guess
  | { type: 'remove'; text: string };

export const demoIntents: VoiceIntent[] = [
  { type: 'want', text: 'حليب', qty: 2 },
  { type: 'want', text: 'خبز صامولي', qty: 1, unit: 'bag' },
  { type: 'ambiguous', word: 'عيش', options: ['c4', 'c6'] }, // rice (Gulf meaning) or bread
  { type: 'remove', text: 'مناديل' },
];

// The noisy recording: only one word came through clearly
export const noisyTranscript: Phrase[] = [
  { text: 'نبي … ', kind: 'plain' },
  { text: 'حليب', kind: 'item' },
  { text: ' … و… ', kind: 'plain' },
];

export const noisyIntent: VoiceIntent = { type: 'want', text: 'حليب', qty: 1 };
