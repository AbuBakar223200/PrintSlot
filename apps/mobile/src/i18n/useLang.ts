import { useEffect } from 'react';
import { Language } from '@printslot/shared';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import i18n from './index';

/**
 * F6 — `useLang()`.
 *
 * Keeps i18next's active language in sync with the settings store (the Profile
 * Language SegmentedControl writes the store; this hook propagates to i18next).
 * Returns the current language + setter for the Profile screen.
 */
export function useLang() {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  useEffect(() => {
    const code = language === Language.BN ? 'bn' : 'en';
    if (i18n.language !== code) {
      void i18n.changeLanguage(code);
    }
  }, [language]);

  return { language, setLanguage };
}
