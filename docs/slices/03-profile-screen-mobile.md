# Slice 03 — Mobile: Profile Screen + Device Registration on Launch

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 02](./02-users-module-api.md)
> **Branch:** `ihm/feat/profile-screen-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

The Users API module exists ([Slice 02](./02-users-module-api.md)). Mobile must:

1. Register the device's Expo push token automatically on every authenticated app launch (no UI — runs in the background as soon as the auth store is hydrated and `isAuthenticated` is true). Without this, push notifications cannot fan out — see [Slice 23](./23-notifications-service-api.md).
2. Provide a profile settings screen where any authenticated user can edit name, phone, and language.

The mobile `users` feature directory does not exist yet. The `authStore` has an `updateUser(user)` action ready to use.

## 2. Goal

(a) Push token registered on every authenticated app launch. (b) A Settings screen accessible from Customer home and Owner shop screen that lets users edit name/phone/language and persists the change via API.

## 3. Files to Create / Modify

### Create
- `apps/mobile/src/features/users/services/usersApi.ts` — typed API wrappers: `updateProfile(input)`, `registerDevice(input)`
- `apps/mobile/src/features/users/hooks/useProfile.ts` — `useUpdateProfile()` mutation
- `apps/mobile/src/features/users/hooks/useDeviceRegistration.ts` — side-effect hook; obtains Expo push token + device ID, calls API
- `apps/mobile/src/features/users/screens/ProfileSettingsScreen.tsx` — the settings UI
- `apps/mobile/src/features/users/__tests__/useProfile.test.ts`
- `apps/mobile/app/(customer)/settings.tsx` — thin wrapper rendering `ProfileSettingsScreen`
- `apps/mobile/app/(owner)/settings.tsx` — thin wrapper rendering same `ProfileSettingsScreen` (shared component)

### Modify
- `apps/mobile/app/_layout.tsx` — invoke `useDeviceRegistration` once auth state resolves to authenticated

### Read first
- `apps/mobile/src/features/auth/hooks/useAuth.ts` — TanStack pattern for hooks
- `apps/mobile/src/features/auth/services/authApi.ts` — `apiFetch` usage
- `apps/mobile/src/features/auth/store/useAuthStore.ts` — `updateUser` action

## 4. Implementation Rules

- **Device registration trigger:** runs once per `_layout.tsx` mount when `isAuthenticated === true` and `isHydrated === true`. Re-run if user logs out and back in.
- **Expo push token:** use `expo-notifications` `getExpoPushTokenAsync({ projectId })`. Pass project ID from `expo.config.js` or `app.json`.
- **Permission flow:** request notification permission via `Notifications.requestPermissionsAsync()`. If permission denied → skip token registration silently (still allow app to function; in-app notifications still work).
- **Device ID:** use `expo-application` `getAndroidId()` or `getIosIdForVendorAsync()`. Fall back to a UUID stored in SecureStore if neither is available. The same device must produce the same ID across launches.
- **Profile mutation:** `useUpdateProfile()` returns `{ mutate, isPending, error }`. On success: invalidate `['auth', 'me']` and call `authStore.updateUser(updatedUser)`.
- **Language change** must also call `i18next.changeLanguage(lang.toLowerCase())` — but only after [Slice 33](./33-i18n-en-bn-mobile.md) ships i18n. Until then, the toggle still updates the user.
- **TanStack Query is the cache** — never persist `User` to Zustand from the server response. Only the auth store's `user` (the session source) is updated via `updateUser()`.
- **Form pattern:** keep fields in local React state. Reset to current user values on mount. Save button disabled while pristine.

## 5. Edge Cases

- **Notification permission denied:** silently skip token registration. Do not throw. Log to console only.
- **App opened on a simulator without push support:** `getExpoPushTokenAsync` throws — catch and skip.
- **Device ID not retrievable (web preview, simulator):** use a SecureStore-persisted UUID. Generate once with `expo-crypto` and cache.
- **Server returns 4xx on device registration:** log error, do not block app navigation. Retry on next app launch.
- **User offline at app launch:** token registration fails silently; will retry on next launch.
- **User edits language then saves while offline:** mutation fails; show error. (Cross-cutting offline handling is deferred — for now just surface the error message.)
- **Same user logs in on multiple devices:** each device produces its own deviceId; each gets its own UserDevice row. All receive push.

## 6. Test Cases

### `useProfile` test
1. `useUpdateProfile().mutate({ name: 'X' })` calls `PATCH /users/me` with body `{ name: 'X' }`.
2. On success, `['auth','me']` query is invalidated.
3. On success, `authStore.updateUser` is called with the returned user.
4. On API error, `error` is exposed and `authStore.user` is unchanged.

### Profile screen behavior (manual smoke or RTL)
5. Screen renders current user name, phone, language values.
6. Save button is disabled when no field has changed.
7. After successful save, screen still shows updated values (from authStore) when navigated away and back.

### Device registration hook
8. With permission granted, hook calls `PATCH /users/me/device` with `{ token, deviceId }`.
9. With permission denied, hook does not call the API.
10. Hook only fires once per mount when authenticated.

## 7. Definition of Done

- [ ] `usersApi.ts`, `useProfile.ts`, `useDeviceRegistration.ts` implemented and exported
- [ ] `ProfileSettingsScreen` renders all three fields with current values
- [ ] Save calls `PATCH /users/me` and updates authStore
- [ ] Device registration hook called from `_layout.tsx` after auth resolves
- [ ] Permission denial does not throw
- [ ] `npm test -- --testPathPattern=users` passes
- [ ] No hardcoded strings — every label is a stable identifier ready for i18n (Slice 33 will replace with `t()`)
- [ ] Branch `ihm/feat/profile-screen-mobile`; PR title `[Slice 03]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met (TanStack Query cache, no useNavigation, etc.)

## 8. Agent Instructions

1. **Read first:**
   - This file
   - [Slice 02](./02-users-module-api.md) §3 (DTO shapes)
   - [`apps/mobile/src/features/auth/hooks/useAuth.ts`](../../apps/mobile/src/features/auth/hooks/useAuth.ts)
   - [`apps/mobile/app/_layout.tsx`](../../apps/mobile/app/_layout.tsx)
   - [`AGENTS.md`](../../AGENTS.md) — React Native rules (Pressable, `<Text>`, no falsy `&&`)
2. **Install packages if missing:** `expo-notifications`, `expo-application`. Add to `apps/mobile/package.json`.
3. **Implement `usersApi.ts`** following `authApi.ts` pattern.
4. **Implement `useProfile.ts`** following `useAuth.ts` patterns; remember to invalidate `['auth','me']`.
5. **Implement `useDeviceRegistration.ts`:** request permissions → get token → get device ID → call API. Wrap in try/catch.
6. **Add the hook call** to `_layout.tsx` inside the existing `useEffect` after the `isAuthenticated` check.
7. **Build the screen** following the `LoginScreen` visual language (gradient bg, glass card, etc. — keep brand consistency).
8. **Test manually:** log in on a simulator, verify network call to `/users/me/device`; edit profile, verify `/users/me` PATCH.

### Gotchas

- Never use `&&` with falsy primitives in JSX: `{count && <X />}` crashes if `count === 0`.
- Wrap every string literal in `<Text>` — never put raw strings inside `<View>`.
- Use `Pressable` not `TouchableOpacity` (project rule).
- The auth store reads token via `getAccessToken()` setter — do not bypass `apiFetch`.

## 9. References

- [`AGENTS.md`](../../AGENTS.md) — Mobile rules
- [`docs/05-api-contract.md`](../05-api-contract.md) §Users endpoints
- [`CLAUDE.md`](../../CLAUDE.md) §"Mobile Architecture"
- [Expo notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
