# Implementation Slices

> See also: [`CONTEXT.md`](../CONTEXT.md) for the document map and golden rules. GitHub issues are the source of truth for live workflow state; this file records durable implementation progress for agents working from the docs.

## Status Legend

| Status | Meaning |
|---|---|
| Closed | GitHub issue is closed and the slice should not be reimplemented. |
| Open | GitHub issue is open and may be selected for implementation. |

## Slice Status

| Slice | GitHub issue | Title | Status | Verified |
|---|---:|---|---|---|
| Slice 01 | #9 | Prisma initial migration + seed (Platform Admin + AppConfig + `order_number_seq`) | Closed | GitHub issue #9 is `CLOSED`; closed at 2026-05-18 14:01:11 UTC. |
| Slice 02 | #10 | Users module — profile update + UserDevice registration (`PATCH /users/me`, `PATCH /users/me/device`, `DELETE /users/me/device/:deviceId`) | Closed | GitHub issue #10 closed; merged in PR #47 at 2026-05-18 20:30:49 UTC. |
| Slice 03 | #11 | Mobile profile screen + push device registration on launch | Closed | Merged in PR #49 at 2026-05-19; mobile/API lint pass, mobile/API tests pass. |
| Slice 04 | #12 | ShopsService - CRUD + status transitions | Closed | Merged in PR #53 at 2026-05-19 via integration issue #54; API lint + 69/69 tests pass. |
| Slice 05 | #13 | Customer shop list screen | Closed | Merged in PR #51 at 2026-05-19 via integration issue #54; mobile lint + 46/46 tests pass. |
| Slice 07 | #15 | SlotsModule - templates + ShopSlots + active slot detection | Closed | GitHub issue #15 is `CLOSED`; merged in PR #57; closed as completed on 2026-06-07. |
| Slice 08 | #16 | Customer slot picker component | Open | GitHub issue #16 is `OPEN` as of 2026-06-07; implementation branch `ab/feat/slot-picker-component-mobile`. |
| Slice 11 | #19 | File picker + upload service + FilePickerCard | Closed | Merged in PR #69 on 2026-06-07; mobile/API/shared lint pass, mobile/API/shared tests pass. |
| Slice 14 | #22 | Order creation wizard (4 steps) | Open | GitHub issue #22 is `OPEN` as of 2026-06-07; implementation branch `ab/feat/order-creation-wizard-mobile`. |
| Slice 16 | #24 | Order detail screen + real-time WebSocket tracking + StatusBadge | Closed | Merged in PR #75 into `ihm/feat/ui-migration` on 2026-06-12; parity + tsc + 108 tests pass. |
| Slice 18 | #26 | Order history screen + OrderCard + cancel flow | Closed | Merged in PR #75 into `ihm/feat/ui-migration` on 2026-06-12; parity + tsc + 108 tests pass. |
| Slice 20 | #28 | Staff job dashboard + job detail + status advance | Closed | Merged in PR #74 into `ihm/feat/ui-migration` on 2026-06-12; parity scanner + tsc + 105 tests pass. |
| Slice 22 | #30 | Wallet screen — balance + transaction history | Closed | On `ihm/feat/ui-migration`; gradient hero + 2-decimal balance fixed in the parity foundation. Closed 2026-06-12; parity + tsc + 108 tests pass. |
| Slice 24 | #32 | Notifications screen + unread badge | Closed | On `ihm/feat/ui-migration`; unread tint + ghost button fixed in the parity foundation. Closed 2026-06-12; parity + tsc + 108 tests pass. |
| Slice 26 | #34 | Staff management screen in owner group | Closed | Merged in PR #76 into `ihm/feat/ui-migration` on 2026-06-12; parity + tsc + 108 tests pass. |
| Slice 28 | #36 | Admin shop approval screen | Closed | Merged in PR #77 into `ihm/feat/ui-migration` on 2026-06-12; parity + tsc + 108 tests pass. |
| Slice 29 | #37 | Admin AppConfig + platform analytics + slot templates screens | Closed | Merged in PR #77 into `ihm/feat/ui-migration` on 2026-06-12; parity + tsc + 108 tests pass. |
| Slice 30 | #38 | (owner) route group — layout + shop screen | Closed | Merged in PR #76 into `ihm/feat/ui-migration` on 2026-06-12; parity + tsc + 108 tests pass. |
| Slice 31 | #39 | (owner) slots, jobs, analytics screens | Closed | Merged in PR #76 into `ihm/feat/ui-migration` on 2026-06-12; parity + tsc + 108 tests pass. |
| Slice 32 | #40 | (customer) tab layout + home screen | Closed | Merged in PR #75 into `ihm/feat/ui-migration` on 2026-06-12; parity + tsc + 108 tests pass. |
| Slice 33 | #41 | i18n setup — EN + BN translations across all screens | Closed | Full prototype dictionary ported into `src/i18n/locales` (parity foundation + per-role PRs). Closed 2026-06-12. |

## Agent Rules

- Treat closed slices as completed project history. Do not create a new implementation for a closed slice unless the user explicitly asks to reopen or replace it.
- Before starting any slice, check the GitHub issue state and this file. If they disagree, trust GitHub for live state and update this file.
- Branch names for slice work should come from the issue title and follow the repo branch naming rules in [`CLAUDE.md`](../CLAUDE.md).
- **After completing any slice or issue, you must follow the Slice Completion Checklist in [`CLAUDE.md`](../CLAUDE.md) before declaring it done.** This includes: updating this file with a `Closed` status row, closing the GitHub issue with a comment referencing the PR, and verifying `docs/05-api-contract.md` matches the implementation.
