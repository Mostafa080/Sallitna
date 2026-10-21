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

// Who the open list is for. Texts can say {{group}} («بلّغ {{group}}» → «بلّغ صحابك») or {{members}}
// («أهل البيت» / «الصحاب»…) and get the right words for this list, in their own language.
type GroupKind = 'family' | 'friends' | 'work' | 'other';
let currentGroup: GroupKind = 'family';

export function setGroup(kind: GroupKind) {
  currentGroup = kind;
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

const GROUP_WORDS = ['group', 'members'];

function interpolate(language: Language, template: string, params?: Params): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    if (params?.[name] !== undefined) return String(params[name]);
    if (GROUP_WORDS.includes(name)) return tIn(language, `groups.${currentGroup}.${name}`);
    return match;
  });
}

export function t(key: string, params?: Params): string {
  return tIn(currentLanguage, key, params);
}

// Translate into a specific language, whatever the app's language is
// (e.g. the helper's screen in English while the family's phone is in Arabic).
export function tIn(language: Language, key: string, params?: Params): string {
  const value = lookup(language, key) ?? lookup('en', key);

  if (typeof value === 'string') return interpolate(language, value, params);

  if (value && typeof value === 'object') {
    const forms = value as Partial<Record<PluralForm, string>>;
    const n = Number(params?.n ?? 0);
    const template = forms[pluralForm(language, n)] ?? forms.other;
    if (template) return interpolate(language, template, params);
  }

  if (__DEV__) console.warn(`[i18n] Missing key: ${key}`);
  return key;
}

// A list of strings (e.g. suggestion chips) in the current language
export function tList(key: string): string[] {
  const value = lookup(currentLanguage, key) ?? lookup('en', key);
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
