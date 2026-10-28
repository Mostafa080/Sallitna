// The privacy policy and terms on sallitna.online (frontend/invite/privacy.html, terms.html).
// Opened inside the app; someone reading English or Hindi lands on the English half.

import * as WebBrowser from 'expo-web-browser';

import type { LanguageKey } from '@/data/fakeHousehold';

const SITE = 'https://sallitna.online';

export function openLegal(page: 'privacy' | 'terms', language: LanguageKey = 'ar') {
  WebBrowser.openBrowserAsync(`${SITE}/${page}${language === 'ar' ? '' : '#en'}`).catch(() => {});
}
