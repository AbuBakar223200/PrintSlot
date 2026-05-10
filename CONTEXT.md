# PrintSlot — Agent Context

Read this before touching any file.

## Stack
- Mobile: React Native (Expo Router)
- API: NestJS
- DB: Supabase PostgreSQL via Prisma
- Auth: Supabase Auth (JWT)
- Files: Cloudinary
- Push: Expo Notifications
- Realtime: WebSocket (socket.io)
- Monorepo: Turborepo + npm workspaces

## Golden Rules

1. **Types live in `packages/shared/src/types/` only.**
   Both apps import from `@printslot/shared`. Never duplicate types.

2. **`@prisma/client` is ONLY imported inside `apps/api/src/`.**
   Mobile NEVER touches Prisma. API maps Prisma models → shared types before returning.

3. **TDD: Write the test first, then the implementation.**
   Test files live in `__tests__/` next to source files.

4. **Feature = vertical slice.**
   One feature spans mobile feature folder + API module folder.
   Do not create cross-feature imports (except shared components/utils).

5. **Zustand = local/UI state. TanStack Query = server/remote state.**
   Never store server responses in Zustand manually — let TanStack Query cache them.

6. **Expo Router handles navigation.**
   Never use `useNavigation()` directly — use typed `router.push()` from expo-router.

## Naming Conventions
- Files: `camelCase.ts` (services, hooks, utils)
- Components: `PascalCase.tsx`
- Test files: `fileName.test.ts` or `fileName.spec.ts`
- Zustand stores: `useXxxStore.ts`
- TanStack hooks: `useXxx.ts` (wraps useQuery/useMutation)
- NestJS DTOs: `action-resource.dto.ts` (e.g. `create-order.dto.ts`)

## Feature Ownership
| Feature | Mobile path | API path |
|---------|-------------|----------|
| Auth | `src/features/auth/` | `src/modules/auth/` |
| Orders | `src/features/orders/` | `src/modules/orders/` |
| Shops | `src/features/shops/` | `src/modules/shops/` |
| Wallet | `src/features/wallet/` | `src/modules/wallet/` |
| Upload | `src/features/upload/` | `src/modules/upload/` |
| Notifications | `src/features/notifications/` | `src/modules/notifications/` |

## API Response Shape
All API responses follow:
```json
{ "data": {}, "message": "ok", "statusCode": 200 }
```
The `response.interceptor.ts` handles this automatically.
