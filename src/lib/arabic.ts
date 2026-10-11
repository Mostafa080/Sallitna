// Makes Arabic text comparable: people type أ/ا/إ, ة/ه, ى/ي interchangeably,
// and sometimes add diacritics or tatweel. Used for search and matching.

const DIACRITICS = /[ً-ٰٟـ]/g; // tashkeel + tatweel
const ARABIC_INDIC_DIGITS = /[٠-٩]/g;

export function toWesternDigits(text: string): string {
  return text.replace(ARABIC_INDIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660));
}

export function normalizeArabic(text: string): string {
  return toWesternDigits(text)
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
