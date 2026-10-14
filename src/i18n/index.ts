// Minimal translation helper: t('home.title'), t('home.itemCount', { n: 12 }).
// A value can be a plain string or a set of plural forms (zero/one/two/few/many/other);
// plural forms are picked using the `n` param.

import ar from './ar.json';
import en from './en.json';
import hi from './hi.json';

export type Language = 'ar' | 'en' | 'hi';

type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
type Params = Record<string, string | number>;

const dictionaries: Record<Language, unknown> = { ar, en, hi };

// Only Arabic for now. Helpers will get their view_language from their member profile later.
let currentLanguage: Language = 'ar';

export function setLanguage(language: Language) {
  currentLanguage = language;
}

export function getLanguage(): Language {
  return currentLanguage;
}

function pluralForm(language: Language, n: number): PluralForm {
  if (language === 'ar') {
    const mod100 = n % 100;
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (mod100 >= 3 && mod100 <= 10) return 'few';
    if (mod100 >= 11 && mod100 <= 99) return 'many';
    return 'other';
  }
  // English and Hindi: one vs. other
  if (language === 'hi') return n === 0 || n === 1 ? 'one' : 'other';
  return n === 1 ? 'one' : 'other';
}

function lookup(language: Language, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      dictionaries[language],
    );
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

export function t(key: string, params?: Params): string {
  return tIn(currentLanguage, key, params);
}

// Translate into a specific language, whatever the app's language is
// (e.g. the helper's screen in English while the family's phone is in Arabic).
export function tIn(language: Language, key: string, params?: Params): string {
  const value = lookup(language, key) ?? lookup('en', key);

  if (typeof value === 'string') return interpolate(value, params);

  if (value && typeof value === 'object') {
    const forms = value as Partial<Record<PluralForm, string>>;
    const n = Number(params?.n ?? 0);
    const template = forms[pluralForm(language, n)] ?? forms.other;
    if (template) return interpolate(template, params);
  }

  if (__DEV__) console.warn(`[i18n] Missing key: ${key}`);
  return key;
}
