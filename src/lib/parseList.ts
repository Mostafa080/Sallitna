// Turns a pasted shopping list (usually from WhatsApp) into item drafts.
//   "- 2 كيلو طماطم\n• خبز صامولي كيس\nحليب، بيض، مويه"
// Lines, commas and bullets split items; a number and/or unit word sets the quantity;
// names are matched against the catalog (including dialect aliases).

import { catalogToDraft, findCatalogMatch } from '@/data/fakeCatalog';
import type { ItemDraft, Unit } from '@/data/fakeHousehold';
import { normalizeArabic, toWesternDigits } from '@/lib/arabic';

const MAX_ITEMS = 30;

// Unit words → unit (and an implied quantity for dual forms like «كيلوين»)
const UNIT_WORDS: Record<string, { unit: Unit; qty?: number }> = {
  كيلو: { unit: 'kg' }, كيلوات: { unit: 'kg' }, كغ: { unit: 'kg' }, كيلوين: { unit: 'kg', qty: 2 },
  كيس: { unit: 'bag' }, اكياس: { unit: 'bag' }, كيسين: { unit: 'bag', qty: 2 },
  حبه: { unit: 'piece' }, حبات: { unit: 'piece' }, حبتين: { unit: 'piece', qty: 2 },
  كرتون: { unit: 'carton' }, كراتين: { unit: 'carton' }, كرتونين: { unit: 'carton', qty: 2 },
  صندوق: { unit: 'box' }, صناديق: { unit: 'box' }, كرتونه: { unit: 'box' },
  علبه: { unit: 'count' }, علب: { unit: 'count' }, علبتين: { unit: 'count', qty: 2 },
};

const SPLIT = /\r?\n|,|،|؛|;|•/;
const LEADING_BULLET = /^\s*[-–—*·▪✅☑\uFE0F]+\s*/u;
const LEADING_NUMBERING = /^\s*\d+\s*[.)]\s+/;
const EMOJI = /[\p{Extended_Pictographic}\uFE0F]/gu;
// Title lines people put on top of a list: "قائمة البيت 🛒", "المقاضي:", "Shopping list"
const TITLE_LINE = /^(قايمه|القايمه|المقاضي|مقاضي|الاغراض|shopping list|list)(\s|$)|:$/i; // normalized spelling; \b does not work with Arabic letters

function parseLine(line: string): ItemDraft | null {
  let text = toWesternDigits(line).replace(EMOJI, '').replace(LEADING_BULLET, '').replace(LEADING_NUMBERING, '').trim();
  if (!text || TITLE_LINE.test(normalizeArabic(text))) return null;

  let qty: number | undefined;
  let unit: Unit | undefined;

  // Pull out a number anywhere in the line ("2 كيلو طماطم", "طماطم 2")
  const number = text.match(/(^|\s)(\d+(?:\.\d+)?)(\s|$)/);
  if (number) {
    qty = Number(number[2]);
    text = (text.slice(0, number.index) + ' ' + text.slice(number.index! + number[0].length)).trim();
  }

  // Pull out a unit word ("كيس", "كيلوين")
  const words = text.split(' ');
  const unitIndex = words.findIndex((w) => UNIT_WORDS[normalizeArabic(w)]);
  if (unitIndex >= 0) {
    const found = UNIT_WORDS[normalizeArabic(words[unitIndex])];
    unit = found.unit;
    qty = qty ?? found.qty;
    words.splice(unitIndex, 1);
    text = words.join(' ').trim();
  }

  if (!text) return null;

  const match = findCatalogMatch(text);
  if (match) return catalogToDraft(match, qty, unit);

  return { name: text, qty: qty ?? 1, unit: unit ?? 'count', category: 'other' };
}

export function parseShoppingList(raw: string): ItemDraft[] {
  const seen = new Set<string>();
  const drafts: ItemDraft[] = [];

  for (const line of raw.split(SPLIT)) {
    const draft = parseLine(line);
    if (!draft) continue;
    const key = normalizeArabic(draft.name);
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push(draft);
    if (drafts.length >= MAX_ITEMS) break;
  }
  return drafts;
}
