// Fake data for the app until Supabase is connected.
// Shapes mirror the planned tables (households, members, items, catalog)
// so swapping to real data later only changes where it comes from.

import { colors } from '@/theme';

export type MemberRole = 'owner' | 'member' | 'helper';
export type ItemStatus = 'open' | 'in_cart' | 'bought' | 'not_found' | 'removed';
export type Unit = 'count' | 'kg' | 'piece' | 'box' | 'carton' | 'bag';
export type CategoryKey = 'produce' | 'dairy' | 'bakery' | 'pantry' | 'cleaning' | 'other';

export type Member = {
  id: string;
  display_name: string;
  initial: string;
  gender: 'f' | 'm';
  role: MemberRole;
  avatar_color: keyof typeof colors;
};

export type Item = {
  id: string;
  name: string;
  qty: number;
  unit: Unit;
  category: CategoryKey;
  status: ItemStatus;
  note: string;
  added_by: string; // member id
  added_via: 'voice' | 'text';
  voice_transcript?: string; // what was said, when added by voice
  requested_by: string[]; // member ids — more than one when several people asked
  claimed_by: string | null; // member who said "I'll get it"
  created_at: string; // ISO date
  // Will come from catalog later:
  translations?: { en: string; hi: string };
  purchase_stats?: { times_this_month: number; last_bought_by: string };
};

export type Household = {
  id: string;
  name: string;
};

// What's needed to add an item (quick-add chips, type-to-add, pasted lists)
export type ItemDraft = Pick<Item, 'name' | 'qty' | 'unit' | 'category'> & Partial<Pick<Item, 'translations'>>;

// A quick-add suggestion (empty state chips). Later: from catalog + household history.
export type Basic = ItemDraft;

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const daysAgo = (d: number) => {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(18, 30, 0, 0);
  return date.toISOString();
};

export const household: Household = { id: 'h1', name: 'بيت أبو خالد' };

export const members: Member[] = [
  { id: 'm1', display_name: 'أم خالد', initial: 'أ', gender: 'f', role: 'owner', avatar_color: 'ink' },
  { id: 'm2', display_name: 'خالد', initial: 'خ', gender: 'm', role: 'member', avatar_color: 'info' },
  { id: 'm3', display_name: 'سارة', initial: 'س', gender: 'f', role: 'member', avatar_color: 'accent' },
  { id: 'm4', display_name: 'Rahul', initial: 'R', gender: 'm', role: 'helper', avatar_color: 'line' },
];

// The person using this phone
export const currentMemberId = 'm1';

// Someone else already at the shops (the Home banner, and "split with…" on start-trip)
export const activeShopperId: string | null = 'm3';
export const activeShopperSinceMinutes = 10;

// Where a trip can be
export type StoreKey = 'supermarket' | 'grocery' | 'pharmacy' | 'bakery';
export const storeOrder: StoreKey[] = ['supermarket', 'grocery', 'pharmacy', 'bakery'];

// Simulated: while you shop, this member adds something by voice (shows as "just added")
export const liveAdderId = 'm2';
export const LIVE_ADD_DELAY_MS = 5000;

export const categoryOrder: CategoryKey[] = ['produce', 'dairy', 'bakery', 'pantry', 'cleaning', 'other'];

const base = { status: 'open' as const, note: '', claimed_by: null };

export function makeDemoItems(): Item[] {
  return [
    {
      ...base, id: 'i1', name: 'طماطم', qty: 2, unit: 'kg', category: 'produce', added_by: 'm1', added_via: 'voice',
      voice_transcript: 'طماطم كيلوين', requested_by: ['m1'], created_at: minutesAgo(5), note: 'حمراء ومو مرة طرية',
      translations: { en: 'Tomatoes', hi: 'टमाटर' }, purchase_stats: { times_this_month: 3, last_bought_by: 'm3' },
    },
    {
      ...base, id: 'i2', name: 'بصل أحمر', qty: 1, unit: 'kg', category: 'produce', added_by: 'm2', added_via: 'text',
      requested_by: ['m2'], created_at: daysAgo(1), translations: { en: 'Red onions', hi: 'लाल प्याज' },
    },
    {
      ...base, id: 'i3', name: 'ليمون', qty: 6, unit: 'piece', category: 'produce', added_by: 'm3', added_via: 'voice',
      voice_transcript: 'ست حبات ليمون', requested_by: ['m3'], created_at: daysAgo(1), translations: { en: 'Lemons', hi: 'नींबू' },
    },
    {
      ...base, id: 'i4', name: 'حليب كامل الدسم', qty: 2, unit: 'count', category: 'dairy', added_by: 'm1', added_via: 'text',
      requested_by: ['m1', 'm2'], created_at: daysAgo(1), translations: { en: 'Full-fat milk', hi: 'फुल क्रीम दूध' },
      purchase_stats: { times_this_month: 4, last_bought_by: 'm4' },
    },
    {
      ...base, id: 'i5', name: 'لبن زبادي', qty: 4, unit: 'count', category: 'dairy', added_by: 'm1', added_via: 'text',
      requested_by: ['m1'], created_at: daysAgo(1), translations: { en: 'Yogurt', hi: 'दही' },
    },
    {
      ...base, id: 'i6', name: 'بيض', qty: 1, unit: 'carton', category: 'dairy', added_by: 'm4', added_via: 'text',
      requested_by: ['m4'], created_at: daysAgo(1), translations: { en: 'Eggs', hi: 'अंडे' },
    },
    {
      ...base, id: 'i7', name: 'خبز صامولي', qty: 1, unit: 'bag', category: 'bakery', added_by: 'm2', added_via: 'voice',
      voice_transcript: 'كيس خبز صامولي', requested_by: ['m2'], created_at: minutesAgo(40),
      translations: { en: 'Samoli bread', hi: 'समोली ब्रेड' },
    },
    {
      ...base, id: 'i8', name: 'رز بسمتي', qty: 5, unit: 'kg', category: 'pantry', added_by: 'm1', added_via: 'voice',
      voice_transcript: 'رز بسمتي خمسة كيلو', requested_by: ['m1'], created_at: minutesAgo(90),
      translations: { en: 'Basmati rice', hi: 'बासमती चावल' },
    },
    {
      ...base, id: 'i9', name: 'سكر', qty: 1, unit: 'kg', category: 'pantry', added_by: 'm3', added_via: 'text',
      requested_by: ['m3'], created_at: daysAgo(2), translations: { en: 'Sugar', hi: 'चीनी' },
    },
    {
      ...base, id: 'i10', name: 'زيت زيتون', qty: 1, unit: 'count', category: 'pantry', added_by: 'm2', added_via: 'text',
      requested_by: ['m2'], created_at: daysAgo(3), translations: { en: 'Olive oil', hi: 'जैतून का तेल' },
    },
    {
      ...base, id: 'i11', name: 'صابون غسيل', qty: 1, unit: 'count', category: 'cleaning', added_by: 'm1', added_via: 'text',
      requested_by: ['m1'], created_at: daysAgo(1), translations: { en: 'Laundry soap', hi: 'कपड़े धोने का साबुन' },
    },
    {
      ...base, id: 'i12', name: 'مناديل', qty: 3, unit: 'count', category: 'cleaning', added_by: 'm4', added_via: 'text',
      requested_by: ['m4'], created_at: daysAgo(2), translations: { en: 'Tissues', hi: 'टिशू' },
    },
  ];
}

export const basics: Basic[] = [
  { name: 'حليب', qty: 1, unit: 'count', category: 'dairy' },
  { name: 'خبز', qty: 1, unit: 'bag', category: 'bakery' },
  { name: 'بيض', qty: 1, unit: 'carton', category: 'dairy' },
  { name: 'رز', qty: 5, unit: 'kg', category: 'pantry' },
  { name: 'ماء', qty: 1, unit: 'box', category: 'pantry' },
  { name: 'طماطم', qty: 1, unit: 'kg', category: 'produce' },
  { name: 'بصل', qty: 1, unit: 'kg', category: 'produce' },
  { name: 'مناديل', qty: 1, unit: 'count', category: 'cleaning' },
];

// Units offered on the item detail screen (the item's own unit is added if missing)
export const commonUnits: Unit[] = ['kg', 'piece', 'box'];

// Items added in the last 10 minutes get the "new" badge
export const NEW_ITEM_WINDOW_MINUTES = 10;
