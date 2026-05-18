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

## Agent Rules

- Treat closed slices as completed project history. Do not create a new implementation for a closed slice unless the user explicitly asks to reopen or replace it.
- Before starting any slice, check the GitHub issue state and this file. If they disagree, trust GitHub for live state and update this file.
- Branch names for slice work should come from the issue title and follow the repo branch naming rules in [`CLAUDE.md`](../CLAUDE.md).
