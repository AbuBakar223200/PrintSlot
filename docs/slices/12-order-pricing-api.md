# Slice 12 — API: Price Engine + Preview-Price Endpoint

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 04](./04-shops-service-api.md)
> **Branch:** `ihm/feat/order-pricing-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

Price is **always** server-calculated. `POST /orders/preview-price` and `POST /orders` (Slice 13) **must** use the identical formula — they cannot diverge. This slice owns the formula and the preview endpoint.

`apps/api/src/modules/orders/orders.service.ts` is an empty stub. `orders.controller.ts` is also empty. The DTO `dto/create-order.dto.ts` exists; verify/extend.

## 2. Goal

A pure `calculatePrice(input, shop)` function and a working `POST /orders/preview-price` endpoint that returns per-file `subtotalPrice` and `totalPrice`. Comprehensive unit tests cover every `ColorMode × PaperSize × duplex` combination.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/api/src/modules/orders/orders.service.ts` — add `calculatePrice()` + `previewPrice()`
- `apps/api/src/modules/orders/orders.controller.ts` — wire `POST /orders/preview-price` only (other routes come in [Slice 13](./13-order-creation-api.md), [Slice 17](./17-order-retrieval-cancel-api.md), [Slice 19](./19-order-status-advance-api.md))
- `apps/api/src/modules/orders/dto/create-order.dto.ts` — verify Zod schema for files array
- `apps/api/src/modules/orders/orders.module.ts` — ensure clean structure (will grow over later slices)

### Create
- `apps/api/src/modules/orders/dto/preview-price.dto.ts` — Zod schema: `{ shopId, files: PreviewFile[] }` where `PreviewFile = { detectedPages, colorMode, paperSize, copies, duplex, pageRange? }`
- `apps/api/src/modules/orders/__tests__/orders.service.spec.ts` — pricing tests (extend if exists)
- `apps/api/src/modules/orders/utils/pageRange.ts` — `parsePageRange(rangeStr, totalPages): number[]` (mirror of mobile util; server-authoritative)
- `apps/api/src/modules/orders/utils/__tests__/pageRange.test.ts`

### Read first
- [`CONTEXT.md`](../../CONTEXT.md) §"Pricing Formula"
- [`docs/04-data-model.md`](../04-data-model.md) §Order, §OrderFile
- [`docs/05-api-contract.md`](../05-api-contract.md) §`POST /orders/preview-price`

## 4. Implementation Rules

### Pricing formula (verbatim from CONTEXT.md)

Per OrderFile:
```
resolvedPages = pageRange ? parsePageRange(pageRange, detectedPages).length : detectedPages
rate          = colorMode === 'COLOR' ? shop.colorRate : shop.bwRate
base          = resolvedPages × copies × rate
surcharge     = paperSize === 'A3' ? resolvedPages × copies × shop.a3Surcharge : 0
body          = duplex ? base × (1 − shop.duplexDiscount) : base
subtotal      = body + surcharge
```

Order:
```
totalPrice = Σ subtotal across all OrderFiles
```

### `calculatePrice(input, shop)` signature
```ts
function calculatePrice(
  files: PreviewFile[],
  shop: { colorRate: Decimal; bwRate: Decimal; a3Surcharge: Decimal; duplexDiscount: Decimal },
): { files: { subtotalPrice: number; resolvedPages: number; colorPages: number; bwPages: number }[]; totalPrice: number; totalPages: number; colorPages: number; bwPages: number; }
```

- Per file, also compute `colorPages` and `bwPages` (for ETA in [Slice 15](./15-orders-gateway-eta-api.md)).
- Order-level `colorPages` = Σ per-file colorPages; same for bwPages.

### Endpoint
- `POST /orders/preview-price` — `CUSTOMER` role.
- Body: `PreviewPriceDto = { shopId, files: PreviewFile[] }`.
- Loads shop, validates ACTIVE (400 if not), runs `calculatePrice`, returns `{ files: [{ subtotalPrice }], totalPrice }`.
- Does not create any DB rows.

### Rules
- **Never accept `totalPrice` or `subtotalPrice` or `resolvedPages` from request body.** Zod `.strict()`.
- **Decimal arithmetic** — use Prisma `Decimal` math or `Number()` with care. Prefer `Decimal` to avoid FP errors; convert to `number` only at the end.
- **Round** totals and subtotals to 2 decimal places.
- **Validate pageRange against detectedPages** in the service; throw 400 on invalid.
- **1–10 files** enforced at DTO level (`.min(1).max(10)`).

## 5. Edge Cases

- **0 files** → DTO rejects (400).
- **11+ files** → DTO rejects (400).
- **Page range exceeds detectedPages** → 400 with field error.
- **`detectedPages = 0`** (corrupt PDF) → 400 ("File has no pages").
- **`pageRange = ''` (empty string)** → treat as null (all pages).
- **`pageRange = null`** → use `detectedPages` directly.
- **Decimal duplexDiscount = 1.0** (100% off) → base × 0 = 0; surcharge still applies; result valid.
- **Negative or zero copies** — DTO `.min(1)` rejects.
- **Shop not found** → 404.
- **Shop not ACTIVE** → 400 "Shop is not currently accepting orders."

## 6. Test Cases

### `parsePageRange` utility (server)
Same as Slice 10 plus: server must remain authoritative — duplicates dedupe, ranges expand, invalid throws.

### `calculatePrice` (mocked shop)
For shop with `colorRate=2`, `bwRate=1`, `a3Surcharge=0.5`, `duplexDiscount=0.2`:

1. **COLOR A4, no duplex, 10 pages, 2 copies, no range** → base = 10×2×2 = 40, surcharge = 0, body = 40, subtotal = 40.
2. **BW A4, duplex, 10 pages, 1 copy** → base = 10×1×1 = 10, body = 10×0.8 = 8, surcharge = 0, subtotal = 8.
3. **COLOR A3, no duplex, 4 pages, 1 copy** → base = 4×1×2 = 8, surcharge = 4×1×0.5 = 2, body = 8, subtotal = 10.
4. **BW A3, duplex, 5 pages, 3 copies** → base = 5×3×1 = 15, body = 15×0.8 = 12, surcharge = 5×3×0.5 = 7.5, subtotal = 19.5.
5. **pageRange "1-5" on 10-page doc** → resolvedPages = 5, used in formula.
6. **Multi-file total** → totalPrice = Σ subtotals.
7. **resolvedPages and colorPages/bwPages correct** per file.

### Endpoint
8. `POST /orders/preview-price` without JWT → 401.
9. With `STAFF` role → 403.
10. Shop not ACTIVE → 400.
11. Invalid pageRange → 400 with field error.
12. Valid request returns `{ files: [{ subtotalPrice }], totalPrice }`.
13. Server rejects `totalPrice` in body (Zod `.strict()`).

## 7. Definition of Done

- [ ] `calculatePrice` pure function exists and tested for all 4 ColorMode×PaperSize×duplex combinations + pageRange variant
- [ ] `parsePageRange` utility on server + tests
- [ ] `POST /orders/preview-price` endpoint wired with CUSTOMER role
- [ ] Server rejects `totalPrice` / `subtotalPrice` / `resolvedPages` in body
- [ ] DTOs use Zod `.strict()`, 1–10 files enforced
- [ ] Tests pass (`npm test -- --testPathPattern=orders`)
- [ ] Branch `ihm/feat/order-pricing-api`; PR title `[Slice 12]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`CONTEXT.md`](../../CONTEXT.md) §Pricing Formula (memorise!)
   - [`docs/04-data-model.md`](../04-data-model.md) §OrderFile
   - [`apps/api/src/modules/shops/shops.service.ts`](../../apps/api/src/modules/shops/shops.service.ts) — for shop loading
2. **Write the page-range util first**. Pure function, 100% test coverage.
3. **Write the `calculatePrice` spec next** — all 6 numbered cases.
4. **Implement `calculatePrice`** using `Prisma.Decimal` math; convert to `number` at the very end.
5. **Write the DTOs** with `.strict()`.
6. **Implement the controller route.**
7. **Run tests** and check formula against the manually-computed expected values in §6.

### Gotchas

- Prisma `Decimal` arithmetic: `decimalA.mul(numB).add(decimalC).toNumber()`. Mixing `Decimal` with native `number` works in mul/add but always finalise to `.toNumber()`.
- Rounding: use `Math.round(x * 100) / 100` for 2-decimal-place display.
- The formula must match what mobile estimates (Slice 14) and what `POST /orders` (Slice 13) uses — extract into a shared `calculatePrice` function called by both endpoints.
- Do not import `calculatePrice` into mobile — re-implement on mobile only if a client preview is needed; server is canonical.

## 9. References

- [`CONTEXT.md`](../../CONTEXT.md) §"Pricing Formula", §"Price server-only"
- [`docs/04-data-model.md`](../04-data-model.md) §OrderFile pricing fields
- [`docs/05-api-contract.md`](../05-api-contract.md) §`POST /orders/preview-price`
