# Definition of Done

> See also: [`CONTEXT.md`](../CONTEXT.md) — Golden Rules (TDD, shared types, Prisma boundary, Zustand vs TanStack Query, Expo Router navigation) are the foundation of this DoD. Every criterion below either directly enforces a Golden Rule or extends it with project-specific requirements.

A feature is **Done** only when **all** criteria below are met. Partial completion is not done.

---

## Code Quality

| # | Criterion |
|---|---|
| 1 | **TDD — test written first.** Unit test exists in `__tests__/` beside the source file before implementation begins. Test must have failed (red) before implementation made it pass (green). |
| 2 | **No failing tests.** `npm test` passes with zero failures across `apps/api`, `apps/mobile`, and `packages/shared`. |
| 3 | **Types in shared only.** All request/response/entity types defined in `packages/shared/src/types/`. No type duplication between mobile and API. Both import from `@printslot/shared`. |
| 4 | **No Prisma on mobile.** `grep -r "@prisma/client" apps/mobile` returns zero results. API services map Prisma models to shared types before returning. |

---

## API Layer

| # | Criterion |
|---|---|
| 5 | **Response shape correct.** Every endpoint returns `{ data: T, message: string, statusCode: number }`. Handled by `response.interceptor.ts` — no manual wrapping in services. |
| 6 | **Role guard enforced.** Every protected endpoint has `@Roles()` decorator. `RolesGuard` verified in controller spec with unauthorized role → 403. |
| 7 | **DTO validation.** All DTOs validated via `ZodValidationPipe`. Invalid input returns 400 with field-level error messages. Tests cover invalid payload cases. |
| 8 | **Errors filtered.** All thrown exceptions pass through `HttpExceptionFilter`. No raw unhandled exceptions reach the client. 500 errors log to server but return generic message to client. |
| 9 | **Price never from client.** `totalPrice` is computed server-side in `OrdersService`. No endpoint accepts `totalPrice` in request body. |

---

## Mobile Layer

| # | Criterion |
|---|---|
| 10 | **Typed navigation only.** All navigation uses `router.push()` / `router.replace()` from `expo-router`. Zero uses of `useNavigation()` in codebase. |
| 11 | **State rules respected.** Server responses cached via TanStack Query only. Zustand stores no server data manually. `useXxx.ts` hooks wrap `useQuery`/`useMutation`. |
| 12 | **Offline handled.** Every screen checks connectivity. Stale cache shown with disconnect banner when offline. All mutation actions (order, cancel, top-up) show offline error and do not fire API calls. |
| 13 | **i18n compliant.** All user-visible strings use i18n translation keys. No hardcoded English or Bengali text in `.tsx` components. |

---

## Notifications

| # | Criterion |
|---|---|
| 14 | **Push token null-checked.** Every notification dispatch in `NotificationsService` checks `user.expoPushToken` before sending. Null token skips push silently but still creates `Notification` DB record. |
| 15 | **In-app record always created.** Every notification event creates a `Notification` row regardless of push token presence. |

---

## Architecture

| # | Criterion |
|---|---|
| 16 | **Vertical slice respected.** Feature code lives in its designated mobile feature folder and API module folder per `CONTEXT.md` feature ownership table. No cross-feature imports except `components/shared/`, `components/ui/`, and `packages/shared`. |
| 17 | **Naming conventions followed.** Files: `camelCase.ts`. Components: `PascalCase.tsx`. Tests: `fileName.test.ts` or `fileName.spec.ts`. Stores: `useXxxStore.ts`. TanStack hooks: `useXxx.ts`. DTOs: `action-resource.dto.ts`. |

---

## Acceptance Testing

| # | Criterion |
|---|---|
| 18 | **Golden path smoke tested.** Feature manually tested on both iOS simulator and Android emulator end-to-end before marking done. |
| 19 | **Error states tested.** Unhappy paths verified: invalid input, unauthorized role, insufficient wallet balance, full slot, cancelled order re-cancel attempt. |
| 20 | **Real-time verified.** For any feature touching order status: WebSocket event fires and UI updates without manual refresh. Verified with two simultaneous clients (staff + customer). |
