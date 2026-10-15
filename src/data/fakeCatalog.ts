// Fake product catalog + dialect aliases + this household's buying habits.
// Mirrors the planned `catalog` + `aliases` tables; habits will come from purchase history.

import type { CategoryKey, ItemDraft, Unit } from '@/data/fakeHousehold';
import { normalizeArabic } from '@/lib/arabic';

export type CatalogItem = {
  id: string;
  name: string;
  aliases: string[]; // dialect words and common spellings that mean this item
  category: CategoryKey;
  default_qty: number;
  default_unit: Unit;
  translations?: { en: string; hi: string };
  alternative?: string; // catalog id to suggest when this isn't in the shop
  habits?: {
    times_this_month: number;
    cadence_days?: number; // how often the household usually buys it
    last_bought_days_ago?: number;
  };
};

export const catalog: CatalogItem[] = [
  {
    id: 'c1', name: 'لبن كامل الدسم', aliases: ['لبن', 'لبن كامل', 'حليب', 'حليب كامل', 'حليب كامل الدسم'], category: 'dairy', alternative: 'c2',
    default_qty: 1, default_unit: 'count', translations: { en: 'Full-fat milk', hi: 'फुल क्रीम दूध' },
    habits: { times_this_month: 4, cadence_days: 7, last_bought_days_ago: 2 },
  },
  {
    id: 'c2', name: 'لبن خالي الدسم', aliases: ['لبن', 'لبن خالي', 'حليب', 'حليب لايت', 'حليب قليل الدسم'], category: 'dairy',
    default_qty: 1, default_unit: 'count', translations: { en: 'Low-fat milk', hi: 'टोंड दूध' },
  },
  {
    id: 'c3', name: 'حلاوة طحينية', aliases: ['حلاوة', 'حلاوه طحينيه'], category: 'pantry',
    default_qty: 1, default_unit: 'count', translations: { en: 'Halva', hi: 'हलवा' },
  },
  {
    id: 'c4', name: 'رز بسمتي', aliases: ['رز', 'أرز'], category: 'pantry',
    default_qty: 5, default_unit: 'kg', translations: { en: 'Basmati rice', hi: 'बासमती चावल' },
    habits: { times_this_month: 1, cadence_days: 21, last_bought_days_ago: 20 },
  },
  {
    // «عيش» = bread in Egypt
    id: 'c5', name: 'عيش فينو', aliases: ['عيش', 'فينو', 'خبز', 'صامولي', 'خبز صامولي'], category: 'bakery',
    default_qty: 1, default_unit: 'bag', translations: { en: 'Fino bread', hi: 'फ़िनो ब्रेड' },
    habits: { times_this_month: 6 },
  },
  {
    id: 'c6', name: 'عيش توست', aliases: ['عيش', 'توست', 'خبز', 'خبز توست'], category: 'bakery',
    default_qty: 1, default_unit: 'bag', translations: { en: 'Toast bread', hi: 'टोस्ट ब्रेड' },
  },
  {
    id: 'c7', name: 'بيض', aliases: ['بيضة', 'بيض بلدي'], category: 'dairy',
    default_qty: 1, default_unit: 'carton', translations: { en: 'Eggs', hi: 'अंडे' },
    habits: { times_this_month: 3 },
  },
  {
    id: 'c8', name: 'مياه', aliases: ['ميه', 'مية', 'ماء', 'مويه', 'موية', 'ماي'], category: 'pantry',
    default_qty: 1, default_unit: 'box', translations: { en: 'Water', hi: 'पानी' },
    habits: { times_this_month: 5 },
  },
  {
    id: 'c9', name: 'زبادي', aliases: ['لبن زبادي', 'روب'], category: 'dairy', // «لبن» alone = milk in Egypt
    default_qty: 4, default_unit: 'count', translations: { en: 'Yogurt', hi: 'दही' },
    habits: { times_this_month: 3 },
  },
  {
    id: 'c10', name: 'بن', aliases: ['قهوة', 'قهوه', 'قهوة عربية'], category: 'pantry',
    default_qty: 1, default_unit: 'count', translations: { en: 'Coffee', hi: 'कॉफ़ी' },
    habits: { times_this_month: 1, cadence_days: 28, last_bought_days_ago: 26 },
  },
  {
    id: 'c11', name: 'طماطم', aliases: ['طماط', 'بندورة'], category: 'produce',
    default_qty: 1, default_unit: 'kg', translations: { en: 'Tomatoes', hi: 'टमाटर' },
    habits: { times_this_month: 3 },
  },
  {
    id: 'c12', name: 'بصل أحمر', aliases: ['بصل'], category: 'produce',
    default_qty: 1, default_unit: 'kg', translations: { en: 'Red onions', hi: 'लाल प्याज' },
  },
  {
    id: 'c13', name: 'خيار', aliases: [], category: 'produce',
    default_qty: 1, default_unit: 'kg', translations: { en: 'Cucumbers', hi: 'खीरा' },
    habits: { times_this_month: 2 },
  },
  {
    id: 'c14', name: 'ليمون', aliases: ['ليمونة'], category: 'produce',
    default_qty: 6, default_unit: 'piece', translations: { en: 'Lemons', hi: 'नींबू' },
  },
  {
    id: 'c15', name: 'جبنة', aliases: ['جبن', 'جبنه'], category: 'dairy',
    default_qty: 1, default_unit: 'count', translations: { en: 'Cheese', hi: 'पनीर' },
    habits: { times_this_month: 2 },
  },
  {
    id: 'c16', name: 'سكر', aliases: [], category: 'pantry',
    default_qty: 1, default_unit: 'kg', translations: { en: 'Sugar', hi: 'चीनी' },
  },
  {
    id: 'c17', name: 'زيت زيتون', aliases: ['زيت'], category: 'pantry',
    default_qty: 1, default_unit: 'count', translations: { en: 'Olive oil', hi: 'जैतून का तेल' },
  },
  {
    id: 'c18', name: 'مناديل', aliases: ['كلينكس', 'محارم', 'فاين'], category: 'cleaning',
    default_qty: 1, default_unit: 'count', translations: { en: 'Tissues', hi: 'टिशू' },
  },
  {
    id: 'c20', name: 'حبهان', aliases: ['هيل', 'هيل حب', 'حبهان حب'], category: 'pantry', alternative: 'c21',
    default_qty: 1, default_unit: 'bag', translations: { en: 'Cardamom', hi: 'इलायची' },
  },
  {
    id: 'c21', name: 'حبهان مطحون', aliases: ['هيل مطحون', 'مطحون'], category: 'pantry',
    default_qty: 1, default_unit: 'bag', translations: { en: 'Ground cardamom', hi: 'पिसी इलायची' },
  },
  {
    id: 'c19', name: 'مسحوق غسيل', aliases: ['مسحوق', 'صابون غسيل', 'تايد', 'صابون'], category: 'cleaning',
    default_qty: 1, default_unit: 'count', translations: { en: 'Laundry detergent', hi: 'कपड़े धोने का पाउडर' },
  },
];

// Precompute normalized search terms once
const searchTerms = new Map(catalog.map((c) => [c.id, [c.name, ...c.aliases].map(normalizeArabic)]));

export function catalogToDraft(item: CatalogItem, qty?: number, unit?: Unit): ItemDraft {
  return {
    name: item.name,
    qty: qty ?? item.default_qty,
    unit: unit ?? item.default_unit,
    category: item.category,
    translations: item.translations,
  };
}

// Exact match on name or any alias («مويه» → ماء)
export function findCatalogMatch(text: string): CatalogItem | undefined {
  const q = normalizeArabic(text);
  return catalog.find((c) => searchTerms.get(c.id)!.includes(q));
}

// Ranked search: exact > starts with > contains. Ties go to what the household buys most.
export function searchCatalog(query: string, limit = 4): CatalogItem[] {
  const q = normalizeArabic(query);
  if (!q) return [];

  const score = (terms: string[]) => {
    if (terms.includes(q)) return 3;
    if (terms.some((term) => term.startsWith(q) || term.split(' ').some((word) => word.startsWith(q)))) return 2;
    if (terms.some((term) => term.includes(q))) return 1;
    return 0;
  };

  return catalog
    .map((item) => ({ item, score: score(searchTerms.get(item.id)!) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (b.item.habits?.times_this_month ?? 0) - (a.item.habits?.times_this_month ?? 0))
    .slice(0, limit)
    .map((r) => r.item);
}

// Items the household usually buys that are due (or nearly due) again
export function runningLow(excludeNames: Set<string>): CatalogItem[] {
  return catalog
    .filter((c) => !excludeNames.has(normalizeArabic(c.name)))
    .filter((c) => {
      const { cadence_days, last_bought_days_ago } = c.habits ?? {};
      return cadence_days && last_bought_days_ago !== undefined && last_bought_days_ago >= cadence_days * 0.85;
    })
    .sort((a, b) => b.habits!.last_bought_days_ago! / b.habits!.cadence_days! - a.habits!.last_bought_days_ago! / a.habits!.cadence_days!);
}

// Most-bought items that aren't on the list right now
export function usualItems(excludeNames: Set<string>, limit = 5): CatalogItem[] {
  return catalog
    .filter((c) => (c.habits?.times_this_month ?? 0) > 0 && !excludeNames.has(normalizeArabic(c.name)))
    .sort((a, b) => b.habits!.times_this_month - a.habits!.times_this_month)
    .slice(0, limit);
}

export function catalogById(id: string): CatalogItem | undefined {
  return catalog.find((c) => c.id === id);
}
