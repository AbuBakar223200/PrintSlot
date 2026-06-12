/**
 * F6 — i18n core.
 *
 * i18next + react-i18next, EN + BN. Flat dotted keys (key/ns separators disabled).
 * `compatibilityJSON: 'v3'` avoids the `Intl.PluralRules` dependency that Hermes
 * lacks on some Android builds. The active language is driven by the settings
 * store via `useLang()`; locale-aware number/date formatting lives in `./format`.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Language } from '@printslot/shared';
import en from './locales/en';
import bn from './locales/bn';

let initialized = false;

export function initI18n(language: Language) {
  if (initialized) return i18n;
  initialized = true;
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
    },
    lng: language === Language.BN ? 'bn' : 'en',
    fallbackLng: 'en',
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v3',
  });
  return i18n;
}

export default i18n;
