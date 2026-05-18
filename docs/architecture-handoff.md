# Architecture Handoff

This file records architecture-review follow-up work that later agents should
preserve. It complements `CONTEXT.md`, `docs/03-architecture-decisions.md`, and
`docs/TECHNICAL_DESIGN.md`.

## 2026-05-18 Review Follow-Up

### Auth session Module

- Mobile request authorization now crosses the `authSession` Interface in
  `apps/mobile/src/features/auth/session/authSession.ts`.
- `apiFetch` reads the current access token through that seam.
- Do not reintroduce token-getter registration from `useAuthStore` into
  `apiFetch`; that made the ordering between SecureStore hydration and request
  authorization implicit.

### Registration contract Module

- Shared registration rules live in
  `packages/shared/src/contracts/auth.contract.ts`.
- API Zod DTOs and mobile client validation should reuse those constants and
  helpers so Customer and Shop Owner registration rules do not drift.
- Server-only checks still belong behind the API seam.

### Order price Module

- `OrdersService.calculatePrice()` is the canonical Order price
  implementation, as required by ADR-011.
- `POST /orders/preview-price` and future Order creation must call this same
  Module. Do not copy the formula into mobile or another API module.
- Preview-price DTOs are strict. `totalPrice`, `subtotalPrice`, and
  `resolvedPages` remain server-computed only.

### Placeholder scaffold policy

- Many future slices still have zero-byte placeholders. Treat those as roadmap
  markers, not implemented Modules.
- Before adding behaviour, either replace a placeholder with a real deep Module
  and tests, or delete it if the planned slice no longer exists.
- Do not add imports to zero-byte placeholders; that creates shallow seams with
  no implementation leverage.
