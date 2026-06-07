# Slice 03 — Mobile: Profile Screen + Device Registration on Launch

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 02](./02-users-module-api.md)
> **Branch:** `ihm/feat/profile-screen-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

> **PRD revision history**
> - **v2 (2026-05-19)** — Rewritten after grilling. Adopts "Profile" as the canonical term (replaces "Settings"), expands the screen to all four role groups, drops `expo-application`/`expo-crypto` in favor of a SecureStore-backed UUID, defers the language toggle to Slice 33, and adds a logout button. See §10 for the full decision log.
> - v1 (initial) — Customer + Owner only, "Settings" naming, native device IDs, language field included.

---

## 1. Problem & Context

The Users API module shipped in [Slice 02](./02-users-module-api.md). Mobile has no UI for the endpoints it exposes, and no path for any user (regardless of role) to:

- Edit their own profile (name, phone).
- Get their device registered for push notifications.
- Log out of the app.

Without device registration, `NotificationsService.send` (Slice 23) has no `UserDevice` rows to fan out to and push notifications are silently dropped — only the in-app DB row is created. Without a logout button, users have no in-app way to end a session; `clearSession()` exists on the auth store but is unreachable from the UI.

The mobile `users` feature directory does not exist yet. The `authStore` has an `updateUser(user)` action ready to use. `expo-notifications` and `expo-secure-store` are already installed; no new native modules are required.

## 2. Goal

1. A shared **Profile screen** mounted at the root of every authenticated role group (`(customer)`, `(owner)`, `(staff)`, `(admin)`) that lets the user edit name and phone, log out, and persists changes via `PATCH /users/me`.
2. **Silent push-token registration** on every authenticated app launch (no UI), running once per `user.id` change, with a SecureStore-backed token cache to avoid redundant API calls.
3. **Logout** that best-effort unregisters the current device, clears the session, and lets the root layout redirect to login.

## 3. Files to Create / Modify

### Create

**Feature module (`apps/mobile/src/features/users/`)**
- `services/usersApi.ts` — typed wrappers: `updateProfile`, `registerDevice`, `unregisterDevice`.
- `services/deviceId.ts` — `getDeviceId()` (cached SecureStore UUID) + internal `randomUuid()` (RFC 4122 v4-shaped, `Math.random`-based — sufficient for a per-user device identifier, see §10 Q5).
- `dto/updateProfile.dto.ts` — Zod schema mirroring server `.strict()` shape: `name` (1–100 trimmed), `phone` (optional, ≤20 trimmed). No `language` field — deferred to Slice 33.
- `hooks/useProfile.ts` — `useUpdateProfile()` mutation.
- `hooks/useDeviceRegistration.ts` — side-effect hook; permission → token → deviceId → API; SecureStore cache to skip unchanged registrations.
- `hooks/useLogout.ts` — orchestrates best-effort `unregisterDevice` + `clearSession`.
- `screens/ProfileScreen.tsx` — shared UI (name field, phone field, save, logout).
- `__tests__/usersApi.test.ts`
- `__tests__/deviceId.test.ts`
- `__tests__/useProfile.test.ts`
- `__tests__/useDeviceRegistration.test.ts`

**Routes (thin wrappers around the shared screen)**
- `apps/mobile/app/(customer)/profile.tsx`
- `apps/mobile/app/(owner)/_layout.tsx` — minimal `Stack` with `headerShown: false`. New route group scaffold; Slice 30 layers richer owner routes on top.
- `apps/mobile/app/(owner)/profile.tsx`
- `apps/mobile/app/(staff)/profile.tsx`
- `apps/mobile/app/(admin)/profile.tsx`

### Modify
- `apps/mobile/app/_layout.tsx` — invoke `useDeviceRegistration()` once auth resolves; flip the `SHOP_OWNER` redirect target from `/(owner)/shop/` to `/(owner)/profile` (Slice 30 will revert when the owner shell ships — track in PR description).
- `CONTEXT.md` — add `Profile` to Domain Language (see §10 Q2).

### Read first
- `apps/mobile/src/features/auth/hooks/useAuth.ts` — TanStack hook patterns.
- `apps/mobile/src/features/auth/services/authApi.ts` — `apiFetch` usage.
- `apps/mobile/src/features/auth/store/useAuthStore.ts` — `updateUser`, `clearSession` actions.
- `apps/mobile/app/(auth)/login.tsx` — visual language (gradient bg, glass card) to match.

## 4. Implementation Rules

### Domain language
- The UI string and route name is **Profile**, not Settings. CONTEXT.md reserves "Settings" for `AppConfig` (admin-managed platform settings). See §10 Q2.

### Device registration trigger
- Single `useEffect` in `useDeviceRegistration` keyed on `[isHydrated, isAuthenticated, user?.id]`.
- A `useRef<string | null>` guards against re-running for the same `user.id` within a mount.
- Re-runs naturally on logout → login as a different user (because `user.id` changes).
- No `AppState` foreground listener and no `Notifications.addPushTokenListener` in this slice (deferred to a future notification-hardening slice).

### Permission flow
- Call `Notifications.requestPermissionsAsync()` cold on first authenticated launch (PRD as written). If status is not `granted`, **skip silently** — do not throw, do not block navigation, do not show UI. A better-UX in-context prompt is deferred to a notifications-onboarding follow-up slice.

### Token cache
- After a successful `PATCH /users/me/device`, write `{ token, deviceId }` to SecureStore under `printslot-last-device-registration`.
- On every subsequent run, read the cache; if `token === cached.token && deviceId === cached.deviceId`, skip the API call entirely.

### DeviceId strategy
- Always use a SecureStore-cached UUID v4. **Do not** use `expo-application` IDs. See §10 Q5 for rationale.
- Generate once with the internal `randomUuid()`; persist to `printslot-device-id`; return on subsequent calls.
- App reinstall produces a new UUID (Keychain/Keystore wiped) — accepted; stale `UserDevice` rows are reactively cleaned up by `DeviceNotRegistered` handling in Slice 23.

### Profile mutation success path
- `onSuccess(updatedUser)` calls `authStore.updateUser(updatedUser)` **synchronously first** (so the header re-renders immediately), then `queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })`. Order matters — prevents a flicker where the form shows new data but the header is stale.
- This is not a Golden Rule #5 violation: the auth store's `user` is **session state**, not a cached server resource. The two stores hold the same shape for different reasons.

### Form behavior
- Local React state per field; reset to current user values on mount and after a successful save.
- Client-side validation via Zod (`UpdateProfileInput`): name 1–100 trimmed, phone optional ≤20 trimmed, `.strict()`. On parse failure, show inline field error; do not fire mutation.
- Save button disabled when pristine. Pristine = `name.trim() === user.name && (phone.trim() || null) === user.phone`. A `useMemo` derives `isDirty`.
- No `language` field. Slice 33 adds the language picker when i18n machinery exists. The data column and API endpoint both already accept `language`; no migration is needed.

### Logout
- A "Log out" `Pressable` at the bottom of `ProfileScreen`.
- On press: `Alert.alert("Log out?", …, [Cancel, Log out (destructive)])`.
- On confirm: call `usersApi.unregisterDevice(deviceId)` wrapped in try/catch (best-effort — failures are logged and swallowed), then `clearSession()`. Root layout reacts to `isAuthenticated === false` and redirects to `/(auth)/login`.

### Owner route-group scaffold
- `(owner)/_layout.tsx` is the minimum scaffold needed to host `(owner)/profile.tsx`. Do **not** add `shop/`, `slots/`, `jobs/`, `analytics/`, or any other owner route — those belong to Slice 30.
- The `(owner)` group exists in this slice only to host the profile route and unbreak the `SHOP_OWNER` redirect temporarily.

### Native deps
- No new native modules. `expo-notifications` and `expo-secure-store` are already installed and listed in `plugins`. Do not add `expo-application` or `expo-crypto`.

### Styling
- Follow `(auth)/login.tsx` visual language (gradient bg, glass card surfaces). Use `Pressable` (project rule), `<Text>` for every string literal, `expo-image` for any image. No `&&` with falsy primitives.

## 5. Edge Cases

- **Notification permission denied** — `useDeviceRegistration` swallows the rejection and logs to console; app continues to function; in-app notifications still work via Slice 23 DB rows.
- **Simulator without push support** — `getExpoPushTokenAsync` throws; catch and skip.
- **Server returns 4xx on device registration** — log, do not block navigation, do not retry inline; the next cold start retries.
- **Offline at launch** — fetch fails silently; retry on next launch.
- **Multiple devices for one user** — each device's SecureStore UUID is independent; each gets its own `UserDevice` row; all receive push.
- **Reinstall on iOS or Android** — Keychain/Keystore wiped, new UUID generated, new `UserDevice` row. Old row is left for the `DeviceNotRegistered` reactive cleanup in Slice 23 to remove.
- **Logout while offline** — `unregisterDevice` POST fails; `clearSession` still runs; session ends. The stale `UserDevice` row will be cleaned reactively on the next push attempt.
- **Logout while a profile save is in-flight** — `clearSession` clears the access token; the in-flight mutation will fail with 401; that's acceptable (user explicitly chose to log out).
- **Form save returns 400 with a field error** — show the error message; keep form dirty so user can fix and retry.
- **Empty phone after trim** — Zod accepts empty optional; server interprets empty as null per Slice 02; field clears properly on next mount.

## 6. Test Cases

All tests are Jest unit tests over hooks and services. No React Testing Library is installed; `ProfileScreen` is manually smoke-tested.

### `deviceId.test.ts`
1. `randomUuid()` returns a string matching the v4 UUID shape regex.
2. `getDeviceId()` returns the same value on consecutive calls within one process.
3. `getDeviceId()` writes to SecureStore under `printslot-device-id` on first call.
4. `getDeviceId()` reads from SecureStore on second call and does not regenerate.

### `usersApi.test.ts`
5. `updateProfile({ name: 'X' })` calls `PATCH /users/me` with body `{ name: 'X' }`.
6. `registerDevice({ token, deviceId })` calls `PATCH /users/me/device` with that body.
7. `unregisterDevice(deviceId)` calls `DELETE /users/me/device/:deviceId` with the id in the path.
8. Each wrapper surfaces non-2xx responses as thrown errors with the server message.

### `useProfile.test.ts`
9. `useUpdateProfile().mutate({ name: 'Jane' })` fires `PATCH /users/me` with `{ name: 'Jane' }`.
10. On success, `authStore.updateUser` is called with the returned user **before** `invalidateQueries` runs.
11. On success, `queryClient.invalidateQueries(['auth','me'])` is called.
12. On API error, `error` is exposed and `authStore.user` is unchanged.

### `useDeviceRegistration.test.ts`
13. With permission granted and no cached registration, hook calls `PATCH /users/me/device` with `{ token, deviceId }`.
14. With permission granted and a cache hit (same `token`+`deviceId`), hook **does not** call the API.
15. With permission denied, hook does not call the API and does not throw.
16. Hook fires once per `user.id` change within a single mount.
17. Hook re-fires when `user.id` changes (simulating logout → relogin as different user).

### Manual smoke (documented in PR body)
- Render `ProfileScreen` in a logged-in customer simulator; verify name + phone show current values, save button disabled until edited.
- Edit name → save → verify header re-renders with new name immediately (updateUser ordering).
- Tap logout → confirm in alert → verify redirect to login.
- Force-quit and relaunch on the same simulator → verify `useDeviceRegistration` skips the API call (cache hit).

## 7. Definition of Done

- [ ] All files listed in §3 created/modified.
- [ ] Branch is `ihm/feat/profile-screen-mobile`, cut from `origin/development`.
- [ ] PR targets `development`, title prefixed `[Slice 03]`.
- [ ] PR description includes:
  - The Slice 30 follow-up note (revert `SHOP_OWNER` redirect target).
  - The deferred notification-onboarding UX note.
  - The deliberate deviation from PRD v1's `expo-application` recommendation, with rationale.
- [ ] `npm test --workspace=apps/mobile -- --testPathPattern=users` passes all 17 cases.
- [ ] No hardcoded user-visible strings beyond stable identifiers ready for i18n replacement in Slice 33.
- [ ] No `useNavigation()`, no `TouchableOpacity`, no falsy `&&` in JSX, no raw strings in `<View>`.
- [ ] All applicable criteria in [`docs/06-definition-of-done.md`](../06-definition-of-done.md) met.
- [ ] CONTEXT.md updated with the `Profile` domain entry.
- [ ] `docs/08-implementation-slices.md` updated with the Slice 03 row when the issue is closed.

## 8. Agent Instructions

1. **Read first:** this file, [Slice 02 §3](./02-users-module-api.md), [`apps/mobile/src/features/auth/hooks/useAuth.ts`](../../apps/mobile/src/features/auth/hooks/useAuth.ts), [`apps/mobile/app/_layout.tsx`](../../apps/mobile/app/_layout.tsx), [`AGENTS.md`](../../AGENTS.md) React Native rules, and the locked decisions in §10.

2. **Implement bottom-up, TDD-style.** Each step commits independently:
   1. `deviceId.ts` + tests.
   2. `usersApi.ts` + tests.
   3. `useProfile.ts` + tests.
   4. `useDeviceRegistration.ts` + tests.
   5. `ProfileScreen.tsx` (manual smoke verification).
   6. Route files for all 4 role groups + `(owner)/_layout.tsx`.
   7. `app/_layout.tsx` updates (device-reg hook call + SHOP_OWNER redirect flip).

3. **Do not** add `expo-application`, `expo-crypto`, or any other native module. The UUID is hand-rolled; SecureStore is already installed.

4. **Do not** add a language field to the form. Slice 33 owns that.

5. **Do not** add owner-shell routes beyond `(owner)/profile.tsx` and `(owner)/_layout.tsx`. Slice 30 owns those.

### Gotchas

- The auth store reads token via `getAccessToken()`-style accessor inside `apiFetch` — do not bypass.
- `@CurrentUser()` is server-side; mobile uses `useAuthStore().user`.
- iOS simulators throw on `getExpoPushTokenAsync` — catch.
- The root layout currently redirects `SHOP_OWNER → /(owner)/shop/`. This slice flips it to `/(owner)/profile`; Slice 30 reverts.

## 9. References

- [`AGENTS.md`](../../AGENTS.md) — mobile coding rules.
- [`docs/05-api-contract.md`](../05-api-contract.md) §Users endpoints.
- [`docs/03-architecture-decisions.md`](../03-architecture-decisions.md) — ADR-001 (route groups), ADR-007 (TanStack/Zustand split).
- [`CONTEXT.md`](../../CONTEXT.md) §"Push tokens live in UserDevice, never on User", §Domain Language.
- [`CLAUDE.md`](../../CLAUDE.md) §"Mobile Architecture", §"React Native Rules".
- [Expo notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/).

---

## 10. Decision Log (grilling session, 2026-05-19)

Decisions recorded inline so a future agent can see *why* the PRD reads the way it does.

### Q1 — Owner route group: scaffold or defer?
**Decision:** Scaffold minimum. Add only `(owner)/_layout.tsx` + `(owner)/profile.tsx`. Slice 30 owns the rest.
**Why:** The `(owner)` group does not exist; root `_layout.tsx` redirects SHOP_OWNER to a dead route. The screen must be reachable for the slice to be exercised, but adding `shop/`/`slots/`/`jobs/`/`analytics/` would invade Slice 30's territory.

### Q1b — SHOP_OWNER root redirect target
**Decision:** Temporarily flip to `/(owner)/profile`. PR description carries a Slice 30 follow-up note to revert.
**Why:** One-line change; makes the slice exercisable for owners; Option 1 (`(owner)/index.tsx`) needs two edits with the same revert cost.

### Q2 — "Profile" vs "Settings"
**Decision:** Canonical term is **Profile**. Routes, screen, hook all use Profile. CONTEXT.md gets a new entry under Domain Language.
**Why:** CONTEXT.md already says `_Avoid_: settings` for non-AppConfig contexts. The GitHub issue title uses "Profile". One clean term beats a documented overload. Future agents and domain experts speak one language for one concept.

### Q3 — Device registration trigger semantics
**Decision:** Auth-keyed `useEffect` with `useRef` guard. Also cache `{ token, deviceId }` in SecureStore and skip API call on cache hit. No AppState listener, no token-rotation listener in this slice.
**Why:** PRD v1 said "once per mount; re-run on relogin" but root `_layout.tsx` doesn't unmount on logout — needs explicit dep tracking. Cache prevents a redundant `PATCH /users/me/device` on every cold start.

### Q4 — Which role groups get a profile route?
**Decision:** All four (Customer, Owner, Staff, Admin).
**Why:** `PATCH /users/me` is role: `Any`. The shared `ProfileScreen` works for any role. Excluding Staff and Admin means they can't change their name/phone — for no architectural reason. Four thin wrappers cost ~10 lines each.

### Q5 — DeviceId strategy
**Decision:** Always SecureStore UUID. Hand-rolled `randomUuid()` (Math.random-based v4 shape). No `expo-application`, no `expo-crypto`.
**Why:**
- `expo-application` introduces platform-asymmetric reinstall behavior (iOS reinstall = new IDFV = orphan UserDevice row; Android = same ID, no orphan).
- `expo-crypto` would be a new native module requiring an EAS rebuild.
- `globalThis.crypto.randomUUID()` is not in Hermes on RN 0.74.
- The `UserDevice` uniqueness constraint is `@@unique([userId, deviceId])` — scoped per user (typically 1–3 devices). Collision probability with weak-random v4 is negligible at that scale.
- The deviceId is an opaque identifier, not a security secret.
- Reactive orphan cleanup via `DeviceNotRegistered` in Slice 23 handles reinstall-induced stale rows.

### Q6 — Language toggle pre-i18n
**Decision:** Hide the language field until Slice 33 ships i18n. Form fields = name + phone only.
**Why:** A toggle that does nothing visible is worse than no toggle. The DB column and API endpoint already accept `language`; Slice 33 adds the UI when it works.

### Q7 — Notification permission prompt
**Decision:** Cold-prompt on first authenticated launch (PRD v1 as written). Flag deferred in-context UX as a follow-up.
**Why:** This slice's job is token registration, not notification onboarding. An in-context pre-prompt requires UX/copy/illustration that's out of scope. The cold prompt is suboptimal but Slices 23–24 don't block on it.

### Q8 — Logout button
**Decision:** Add to `ProfileScreen`. Native `Alert.alert` confirmation. Best-effort `DELETE /users/me/device/:deviceId` → `clearSession()`.
**Why:** `clearSession()` already exists but no UI calls it — users have no in-app logout path. Profile screen is the natural home. Best-effort device unregistration prevents stale push delivery to the previous user of the device.

### Q9a — Mutation success: cache update order
**Decision:** `updateUser(returnedUser)` synchronously **first**, then `invalidateQueries(['auth','me'])`.
**Why:** The auth store drives `_layout.tsx` role routing and the screen header. Updating it first prevents a flicker where the form shows new data but the header is stale. Not a Golden Rule #5 violation — auth `user` is session state, not a cached query result. JSDoc on `useAuthStore.ts` should reinforce this.

### Q9b — Client-side Zod validation
**Decision:** Medium-strictness Zod on the client. `name`: 1–100 trimmed. `phone`: optional ≤20 trimmed. `.strict()`.
**Why:** Provides fail-fast UX and type safety. Does **not** prevent SQL injection — Prisma's parameterized queries are the actual SQLi defense. Server already has its own `.strict()` Zod from Slice 02 as the security boundary.

### Q9c — Save button dirty state
**Decision:** `useMemo` over trimmed inputs vs current user fields. Empty trimmed phone matches null.
**Why:** Standard pattern; handles the "edit then revert" case correctly.
