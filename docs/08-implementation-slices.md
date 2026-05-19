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
| Slice 03 | #49 | Mobile profile screen + push device registration on launch | Closed | Merged in PR #49 at 2026-05-19; local verification: mobile/API lint pass, mobile/API tests pass. |
| Slice 04 | #12 | ShopsService - CRUD + status transitions | Open | GitHub issue #12 is `OPEN`; implementation prepared on branch `ab/feat/shops-service-api`. |

## Agent Rules

- Treat closed slices as completed project history. Do not create a new implementation for a closed slice unless the user explicitly asks to reopen or replace it.
- Before starting any slice, check the GitHub issue state and this file. If they disagree, trust GitHub for live state and update this file.
- Branch names for slice work should come from the issue title and follow the repo branch naming rules in [`CLAUDE.md`](../CLAUDE.md).
- **After completing any slice or issue, you must follow the Slice Completion Checklist in [`CLAUDE.md`](../CLAUDE.md) before declaring it done.** This includes: updating this file with a `Closed` status row, closing the GitHub issue with a comment referencing the PR, and verifying `docs/05-api-contract.md` matches the implementation.
