# PrintSlot — Implementation Slices

This directory contains one dedicated PRD per vertical slice required to ship v1. Each file is self-contained: an agent can pick a slice up cold, follow its instructions, and complete it without reading any other slice file.

---

## How to use this directory

1. Pick a slice whose **Blocked by** is empty or already complete.
2. Open the slice's PRD. Read every section in order.
3. Read every doc referenced under **References**.
4. Create the branch named under the **Branch** field (must follow `ihm/<type>/<kebab-name>`).
5. Implement, write tests, commit.
6. Tick every checkbox in **Definition of Done** before opening the PR.
7. Reference the slice number in the PR title: `[Slice 07] feat(api): SlotsModule`.

---

## Slice Index

Status legend: ✅ done · 🟡 in progress · ⬜ not started

| # | Title | Type | Priority | Blocked by | Status |
|---|---|---|---|---|---|
| 01 | [Prisma initial migration + seed](./01-prisma-migration-seed.md) | Infra | P0 | — | ⬜ |
| 02 | [API: Users module — profile + device registration](./02-users-module-api.md) | API | P0 | 01 | ⬜ |
| 03 | [Mobile: Profile screen + push device registration on launch](./03-profile-screen-mobile.md) | Mobile | P0 | 02 | ⬜ |
| 04 | [API: ShopsService — CRUD + status transitions](./04-shops-service-api.md) | API | P0 | 01 | ⬜ |
| 05 | [Mobile: Customer shop list screen](./05-shop-list-screen-mobile.md) | Mobile | P0 | 04 | ⬜ |
| 06 | [Mobile: Customer shop detail screen](./06-shop-detail-screen-mobile.md) | Mobile | P0 | 04, 07 | ⬜ |
| 07 | [API: SlotsModule — templates + ShopSlots + active slot](./07-slots-module-api.md) | API | P0 | 04 | ⬜ |
| 08 | [Mobile: Customer slot picker component](./08-slot-picker-component-mobile.md) | Mobile | P0 | 07 | ⬜ |
| 09 | [API: UploadService — Cloudinary + pdf-parse](./09-upload-service-api.md) | API | P0 | 01 | ⬜ |
| 10 | [Mobile: PrintConfigForm component](./10-print-config-form-mobile.md) | Mobile | P0 | — | ⬜ |
| 11 | [Mobile: File picker + upload service + FilePickerCard](./11-file-upload-mobile.md) | Mobile | P0 | 09, 10 | ⬜ |
| 12 | [API: Price engine + preview-price endpoint](./12-order-pricing-api.md) | API | P0 | 04 | ⬜ |
| 13 | [API: POST /orders — atomic order creation](./13-order-creation-api.md) | API | P0 | 07, 12, 21, 23 | ⬜ |
| 14 | [Mobile: Order creation wizard (4 steps)](./14-order-creation-wizard-mobile.md) | Mobile | P0 | 06, 08, 11, 13 | ⬜ |
| 15 | [API: OrdersGateway + ETA algorithm + queue position](./15-orders-gateway-eta-api.md) | API | P0 | 13 | ⬜ |
| 16 | [Mobile: Order detail + real-time tracking + StatusBadge](./16-order-detail-tracking-mobile.md) | Mobile | P0 | 15 | ⬜ |
| 17 | [API: Order retrieval + cancellation](./17-order-retrieval-cancel-api.md) | API | P0 | 13, 21 | ⬜ |
| 18 | [Mobile: Order history + OrderCard + cancel flow](./18-order-history-cancel-mobile.md) | Mobile | P0 | 16, 17 | ⬜ |
| 19 | [API: Order status advance + optimistic lock](./19-order-status-advance-api.md) | API | P0 | 13, 15, 23 | ⬜ |
| 20 | [Mobile: Staff job dashboard + status advance](./20-staff-job-dashboard-mobile.md) | Mobile | P0 | 19 | ⬜ |
| 21 | [API: WalletService — balance, debit, credit, top-up](./21-wallet-service-api.md) | API | P0 | 01, 23 | ⬜ |
| 22 | [Mobile: Wallet screen](./22-wallet-screen-mobile.md) | Mobile | P0 | 21 | ⬜ |
| 23 | [API: NotificationsService — 12 events + Expo fan-out](./23-notifications-service-api.md) | API | P0 | 02 | ⬜ |
| 24 | [Mobile: Notifications screen + unread badge](./24-notifications-screen-mobile.md) | Mobile | P0 | 23 | ⬜ |
| 25 | [API: StaffService — promote/demote/list](./25-staff-service-api.md) | API | P0 | 04, 23 | ⬜ |
| 26 | [Mobile: Staff management screen in owner group](./26-staff-management-screen-mobile.md) | Mobile | P0 | 25, 30 | ⬜ |
| 27 | [API: AdminModule — AppConfig + analytics endpoints](./27-admin-module-api.md) | API | P0 | 04, 13 | ⬜ |
| 28 | [Mobile: Admin shop approval screen](./28-admin-shop-approval-mobile.md) | Mobile | P0 | 04, 27 | ⬜ |
| 29 | [Mobile: Admin AppConfig + platform analytics screens](./29-admin-config-analytics-mobile.md) | Mobile | P0 | 27 | ⬜ |
| 30 | [Mobile: (owner) route group — layout + shop screen](./30-owner-route-group-mobile.md) | Mobile | P0 | 04 | ⬜ |
| 31 | [Mobile: (owner) slots, jobs, analytics screens](./31-owner-slots-jobs-analytics-mobile.md) | Mobile | P0 | 07, 19, 27, 30 | ⬜ |
| 32 | [Mobile: (customer) tab layout + home screen](./32-customer-home-tabs-mobile.md) | Mobile | P0 | 18, 22, 24 | ⬜ |
| 33 | [Mobile: i18n setup — EN + BN translations applied across all screens](./33-i18n-en-bn-mobile.md) | Mobile | P1 | 32 | ⬜ |

---

## Dependency chain (critical path)

```
01 ──┬─► 02 ──► 03
     ├─► 04 ──┬─► 05
     │        ├─► 07 ──┬─► 08
     │        │        └─► 13
     │        ├─► 06
     │        ├─► 12 ──► 13
     │        ├─► 25 ──► 26
     │        └─► 27 ──┬─► 28
     │                 └─► 29
     ├─► 09 ──┬─► 11
     │        └─► 10 ──► 11
     ├─► 23 ──┬─► 13
     │        ├─► 21 ──┬─► 13
     │        │        └─► 22
     │        ├─► 24
     │        └─► 25
     │
     └─► 13 ──┬─► 14
              ├─► 15 ──► 16 ──► 18
              ├─► 17 ──► 18
              └─► 19 ──► 20

30 ──► 31, 26
32 ◄── 18, 22, 24
33 ◄── 32
```

---

## Ship-readiness checklist

The platform is considered shippable when:

- [ ] All 33 slices have all DoD checkboxes ticked
- [ ] Every P0 feature in [`docs/02-feature-registry.md`](../02-feature-registry.md) is implemented
- [ ] All 20 criteria in [`docs/06-definition-of-done.md`](../06-definition-of-done.md) hold for every feature
- [ ] Every use case in [`docs/use-cases.md`](../use-cases.md) is verified on iOS and Android
- [ ] Render API deploy is green; Expo EAS build is green
- [ ] Seed has produced the Platform Admin account and AppConfig keys in production DB

---

## Related docs

- [PRD.md](../PRD.md) — product requirements
- [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) — architecture
- [CODING_STANDARDS.md](../CODING_STANDARDS.md) — patterns and examples
- [04-data-model.md](../04-data-model.md) — every entity and relation
- [05-api-contract.md](../05-api-contract.md) — every endpoint
- [06-definition-of-done.md](../06-definition-of-done.md) — universal DoD
- [07-risk-register.md](../07-risk-register.md) — known risks
- [use-cases.md](../use-cases.md) — every actor + flow
- [CONTEXT.md](../CONTEXT.md) — golden rules + glossary
