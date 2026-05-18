# Slice 33 — Mobile: i18n Setup (English + Bengali) Across All Screens

> **Type:** Mobile
> **Priority:** P1 (does not block shipping a working English-only app, but required for DoD)
> **Blocked by:** [Slice 32](./32-customer-home-tabs-mobile.md)
> **Branch:** `ihm/feat/i18n-en-bn-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p1`

---

## 1. Context

DoD criterion 13 requires "no hardcoded English or Bengali text in `.tsx` components." All previously-built slices wrap strings in `t('key')` placeholders. This slice ships `i18next` + `react-i18next`, the EN/BN locale files, and a language toggle that calls `PATCH /users/me { language }`.

## 2. Goal

App is fully usable in English (default) and Bengali. Every visible string comes from `t()`. Language preference persisted on the User and used on app launch.

## 3. Files to Create / Modify

### Create
- `apps/mobile/src/i18n/index.ts` — `i18next` initialisation
- `apps/mobile/src/i18n/locales/en.json` — all English strings
- `apps/mobile/src/i18n/locales/bn.json` — Bengali equivalents
- `apps/mobile/src/hooks/useAppLanguage.ts` — language getter/setter hook

### Modify
- `apps/mobile/app/_layout.tsx` — initialise i18n + change language when user.language changes
- **Every `.tsx` screen file** — replace string literals with `t('key')` calls
- `apps/mobile/src/features/users/screens/ProfileSettingsScreen.tsx` ([Slice 03](./03-profile-screen-mobile.md)) — wire the language toggle

### Modify package.json
- Add `i18next`, `react-i18next` if missing

### Read first
- [`CONTEXT.md`](../../CONTEXT.md) §"i18n", §Naming Conventions

## 4. Implementation Rules

### i18next init

```ts
// apps/mobile/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import bn from './locales/bn.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, bn: { translation: bn } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

### Init at app launch
- `import './src/i18n'` at top of `app/_layout.tsx` (or `index.ts` — pick the earliest entry point).
- After auth hydration, if `user.language === 'BN'`, call `i18n.changeLanguage('bn')`.

### Hook

```ts
// useAppLanguage.ts
export function useAppLanguage() {
  const { user, updateUser } = useAuthStore();
  const updateProfile = useUpdateProfile();

  const setLanguage = async (lang: 'EN' | 'BN') => {
    await updateProfile.mutateAsync({ language: lang });
    i18n.changeLanguage(lang.toLowerCase());
  };

  return { current: user?.language ?? 'EN', setLanguage };
}
```

### Key naming convention
`feature.component.label` e.g. `auth.login.title`, `orders.detail.cancelButton`, `common.button.save`.

### Namespaces (top-level keys in en.json / bn.json)
- `common` — buttons, errors, generic
- `auth` — login, register
- `users` — profile
- `shops` — shop list/detail/management
- `slots` — slot picker, slot management
- `upload` — file picker
- `orders` — wizard, history, detail, cancel
- `wallet` — balance, transactions
- `notifications` — list, type labels
- `staff` — management
- `admin` — admin screens
- `owner` — owner screens

### Rules
- **Zero hardcoded strings in JSX text nodes** after this slice.
- **Bengali translations must be real** — not English placeholders.
- **Both files have identical key sets** — automate a check script `npm run i18n:check`.
- **Interpolation** for dynamic values: `t('orders.detail.eta', { mins: 12 })` with `en.json: { "orders": { "detail": { "eta": "~{{mins}} min" } } }`.
- **Test files exempt** — they can still have raw strings.

## 5. Edge Cases

- **Missing key in BN file:** falls back to EN.
- **User toggles language while offline:** mutation fails; revert UI to previous.
- **First-time launch with `user.language === 'BN'`:** language switched immediately on auth resolve.
- **Push notification text:** server sends English titles/bodies in v1 (acceptable trade-off; future enhancement could pass language to NotificationsService).

## 6. Test Cases

1. `t('common.button.save')` returns "Save" in EN and "সংরক্ষণ করুন" in BN.
2. `useAppLanguage().setLanguage('BN')` calls `PATCH /users/me` and changes i18next language.
3. App initialised in user's stored language on launch.
4. Missing BN key falls back to EN.
5. (Static check) No `.tsx` file outside `__tests__/` contains hardcoded user-facing strings.

## 7. Definition of Done

- [ ] `i18next` + `react-i18next` installed and initialised
- [ ] `en.json` and `bn.json` exist with all keys
- [ ] Every screen replaced hardcoded strings with `t()`
- [ ] Language toggle in ProfileSettingsScreen working
- [ ] Initial language honored from `user.language`
- [ ] Missing BN keys fall back to EN
- [ ] `npm run i18n:check` (or equivalent) passes
- [ ] Tests pass
- [ ] Branch `ihm/feat/i18n-en-bn-mobile`; PR title `[Slice 33]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met — especially #13 (i18n compliant)

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`CONTEXT.md`](../../CONTEXT.md) §i18n
   - Existing screens to inventory all the strings
2. **Install `i18next` + `react-i18next`.**
3. **Build the init file and import in `_layout.tsx`.**
4. **Build `useAppLanguage`.**
5. **Inventory strings** — grep `apps/mobile` for hardcoded English strings inside `<Text>` and replace systematically with `t('key')`.
6. **Build the EN file** as the canonical source.
7. **Build the BN file** with native Bengali translations. Use authentic Bengali for the PrintSlot domain — `Print Slot` can stay as is, but UI verbs (Save, Cancel, Confirm, Pay, etc.) must be in Bengali.
8. **Write a script** `tools/i18n-check.js` that asserts key parity between EN and BN. Add to `package.json` scripts.
9. **Smoke test** by toggling language in app — verify ALL screens re-render in Bengali.

### Gotchas

- React Native does not auto-restart on language change — `i18next.changeLanguage` triggers re-renders via `useTranslation` automatically.
- Numbers and dates: do not translate. Currency `৳` is locale-neutral.
- Some text comes from the server (notification titles/bodies, error messages). For v1, leave those English and consider server-side i18n in a future iteration.

## 9. References

- [`CONTEXT.md`](../../CONTEXT.md) §i18n, §Naming Conventions
- [`docs/PRD.md`](../PRD.md) §6.14 Internationalisation
- [react-i18next docs](https://react.i18next.com/)
