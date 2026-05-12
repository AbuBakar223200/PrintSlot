# Risk Register

> See also: [`CONTEXT.md`](../CONTEXT.md) — stack and golden rules referenced in mitigations below.

**Likelihood:** Low · Medium · High
**Impact:** Low · Medium · High · Critical

---

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Prisma schema wrong early** — incorrect relations or missing fields force destructive migrations mid-build, breaking all services already implemented against old schema | High | Critical | Write and peer-review full `schema.prisma` against `docs/04-data-model.md` before touching any service. Run `prisma migrate dev` and seed script on day one. No feature work starts until first migration succeeds. |
| 2 | **Slot + wallet concurrency bugs** — two customers book last slot simultaneously, or concurrent orders double-deduct wallet | Medium | High | `ShopSlot.currentCount` incremented via `prisma.$transaction` with `increment` + re-read check. Wallet debit inside `prisma.$transaction` that re-checks balance sum before inserting debit row. Both paths covered by integration tests simulating concurrent requests. |
| 3 | **WebSocket drops silently on mobile** — customer loses connection during job processing, misses `order:status_changed`, thinks order stuck forever | Medium | Medium | TanStack Query polls `GET /orders/:id` every 30 seconds as silent fallback (ADR-006). Disconnect banner shown. On reconnect, `order:join` re-emitted automatically. Customer never relies solely on WebSocket for final state. |
| 4 | **File upload abuse** — customer uploads oversized or malicious file (e.g. 500 MB video, executable disguised as PDF), crashes server or fills Cloudinary storage | High | Medium | Multer hard limit: 20 MB (`413` on exceed). MIME type whitelist enforced server-side by inspecting actual MIME (not just extension) before Cloudinary receives file. Cloudinary upload preset configured to reject non-whitelisted formats as second layer. |
| 5 | **Payment gateway scope creep** — bKash / card integration is non-trivial (sandbox onboarding, callback webhooks, failure recovery), delays all of v1 | Medium | High | v1 ships wallet top-up via **admin credit only** (`POST /wallet/topup`, P0). Gateway integration (`POST /wallet/topup/gateway`, P1) isolated behind its own endpoint — zero other features depend on it. Team defers P1 until all P0 features done and tested. |

---

## Watch List *(low likelihood now, monitor)*

| Item | Why to Watch |
|---|---|
| Expo SDK version lock | Expo SDK 51 drops iOS < 16 and Android < 8. Upgrading mid-project risks breaking native modules. Lock SDK version in `app.json` on day one. |
| Render cold start latency | Render free tier spins down after inactivity → first request ~10–30s. Use paid instance or configure a keep-alive ping for demo/launch. |
| Supabase JWT clock skew | JWT `exp` validation in `supabase-jwt.strategy.ts` can fail if server clock drifts. Ensure server time synced via NTP; add 30s leeway to `exp` check. |
| i18n string drift | As features are added, developers forget to add Bengali translations → untranslated keys fall back to key string in UI. Enforce i18n lint rule in CI that fails on missing translation keys. |
