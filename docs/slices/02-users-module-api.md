# Slice 02 — API: Users Module (profile + device registration)

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 01](./01-prisma-migration-seed.md)
> **Branch:** `ihm/feat/users-module-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

`apps/api/src/modules/users/` exists as scaffolding with empty stub files. AuthService already manages registration and login. The Users module must own:

- Profile updates (name, phone, language) — needed by Customer profile screen and Owner edit settings.
- `UserDevice` registration — required before any notification slice can deliver push notifications. Without it, mobile devices have no entry in `UserDevice` and `NotificationsService.send` will skip push entirely (only DB row created).

The `UserDevice` model in `schema.prisma` enforces `@@unique([userId, deviceId])` so the same physical device updates its token instead of creating duplicate rows.

## 2. Goal

Two working, authenticated endpoints — `PATCH /users/me` (profile) and `PATCH /users/me/device` (push token upsert) — wired through `UsersController`, validated with Zod, returning shared types, fully unit-tested.

## 3. Files to Create / Modify

### Modify (stub files exist — replace empty content)
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.module.ts` — ensure `UsersService` exported (so other modules can inject it if needed)

### Create
- `apps/api/src/modules/users/dto/update-user.dto.ts` — Zod schema (file may already exist as stub; verify)
- `apps/api/src/modules/users/dto/register-device.dto.ts` — Zod schema for `{ token, deviceId }`
- `apps/api/src/modules/users/__tests__/users.service.spec.ts`
- `apps/api/src/modules/users/__tests__/users.controller.spec.ts`

### Read first
- `apps/api/src/modules/auth/auth.controller.ts` — pattern for `@CurrentUser()` + `@UseGuards(JwtAuthGuard)`
- `apps/api/src/modules/auth/auth.service.ts` — pattern for mapping Prisma → shared types
- `packages/shared/src/types/user.types.ts` — `User` and (add if missing) `UserDevice` shapes

## 4. Implementation Rules

- **Endpoints:**
  - `PATCH /users/me` — JwtAuthGuard. Body: `{ name?, phone?, language? }`. All fields optional. Returns full updated `User` (shared type).
  - `PATCH /users/me/device` — JwtAuthGuard. Body: `{ token: string, deviceId: string }`. Both required. Upserts `UserDevice` on `@@unique([userId, deviceId])`. Returns `{ id, deviceId, updatedAt }`.
- **`@CurrentUser()` decorator** provides the authenticated `User` (resolved by `SupabaseJwtStrategy` from JWT). Use `user.id` as `userId`.
- **DTOs use Zod**, validated via the global `ZodValidationPipe`. Reject unknown fields with `.strict()`.
- **Language enum:** only `'EN'` or `'BN'`. Use `z.enum(['EN', 'BN'])`.
- **No partial leaks:** Service maps Prisma `User` to shared `User` before returning. Convert `createdAt` and `updatedAt` to ISO strings.
- **Service is pure logic:** Controllers only route. No business logic in controllers.
- **No password / email changes** — those are not part of v1 scope. Reject unknown fields per `.strict()`.

## 5. Edge Cases

- **Empty body** — Zod allows all-optional bodies; service must handle and return current user without writes (preferably skip the update call entirely if no fields present).
- **Phone string with whitespace** — `.trim()` server-side before saving (defensive). Empty string after trim → null.
- **Duplicate device registration (same deviceId, new token)** — upsert updates `token` and `updatedAt`. Test this path.
- **First-time device registration** — upsert inserts new row.
- **User has 3 devices** — registering a 4th is allowed; no max device count.
- **Invalid language value** (e.g. `'fr'`) — Zod validation fails → 400 with field error.
- **Unauthenticated request** — JwtAuthGuard returns 401. Verified in controller spec.

## 6. Test Cases

### Service spec
1. `updateProfile({ name: 'Jane' }, userId)` returns updated user with new name.
2. `updateProfile({ language: 'BN' }, userId)` updates language only; other fields unchanged.
3. `updateProfile({}, userId)` returns user without making a DB write (or no-op write).
4. `registerDevice({ token, deviceId }, userId)` creates a new `UserDevice` row when none exists.
5. `registerDevice({ token: 'new', deviceId: 'D1' }, userId)` updates `token` when row with that `deviceId` already exists for this user.
6. Service returns shared `User` shape (not Prisma model); `createdAt`/`updatedAt` are strings.

### Controller spec
7. `PATCH /users/me` without JWT returns 401.
8. `PATCH /users/me` with `{ language: 'INVALID' }` returns 400 with field error.
9. `PATCH /users/me/device` without `deviceId` returns 400.
10. Response envelope matches `{ data, message, statusCode }`.

## 7. Definition of Done

- [ ] `users.service.ts` implements `updateProfile()` and `registerDevice()`
- [ ] `users.controller.ts` wires `PATCH /users/me` and `PATCH /users/me/device` with `JwtAuthGuard` and `ZodValidationPipe`
- [ ] DTOs use Zod with `.strict()`
- [ ] Service spec passes all 6 cases above
- [ ] Controller spec passes all 4 cases above
- [ ] Both endpoints return shared `User` / `UserDevice` types — never Prisma models
- [ ] `npm test -- --testPathPattern=users` passes
- [ ] Branch named `ihm/feat/users-module-api`
- [ ] PR title prefixed `[Slice 02]`
- [ ] All applicable criteria in [`docs/06-definition-of-done.md`](../06-definition-of-done.md) met

## 8. Agent Instructions

1. **Read first:**
   - This file in full
   - [`docs/05-api-contract.md`](../05-api-contract.md) §Users endpoints
   - [`apps/api/src/modules/auth/auth.service.ts`](../../apps/api/src/modules/auth/auth.service.ts) — copy the `mapToSharedUser` helper pattern
   - [`apps/api/src/modules/auth/auth.controller.ts`](../../apps/api/src/modules/auth/auth.controller.ts) — copy the controller pattern
   - [`packages/shared/src/types/user.types.ts`](../../packages/shared/src/types/user.types.ts) — verify `UserDevice` type exists, add if missing
2. **Write DTOs first** (Zod schemas with `.strict()`).
3. **Write service spec next** (TDD — red phase: tests fail because service is empty).
4. **Implement service** to make tests pass (green).
5. **Write controller spec.**
6. **Implement controller.**
7. **Run** `npm test -- --testPathPattern=users` and verify all pass.
8. **Verify response envelope** by manually inspecting controller return (should not double-wrap — `ResponseInterceptor` handles wrapping).

### Gotchas

- The global `ZodValidationPipe` is registered in `app.module.ts`. Do not register it again on the controller.
- `@CurrentUser()` returns the full shared `User` (resolved by strategy). Use `user.id`, not the raw JWT subject.
- Mapping Prisma `Decimal` to JS `number` is **not** needed for User (no Decimal fields here); just convert dates to ISO strings.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §`PATCH /users/me`, `PATCH /users/me/device`
- [`docs/CODING_STANDARDS.md`](../CODING_STANDARDS.md) §NestJS module structure
- [`CONTEXT.md`](../../CONTEXT.md) §"Push tokens live in `UserDevice`, never on `User`"
