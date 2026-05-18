# Slice 10 — Mobile: PrintConfigForm Component

> **Type:** Mobile (reusable component)
> **Priority:** P0
> **Blocked by:** None (uses only shared types)
> **Branch:** `ihm/feat/print-config-form-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

Every uploaded `OrderFile` needs its own print configuration: colorMode, paperSize, orientation, copies, duplex, and an optional pageRange. The component `apps/mobile/src/components/shared/PrintConfigForm.tsx` exists as a stub. It will be used inside [Slice 11](./11-file-upload-mobile.md) (FilePickerCard) and [Slice 14](./14-order-creation-wizard-mobile.md) (wizard step 2).

This is a controlled component — parent owns the state, the form pushes changes up.

## 2. Goal

A polished, fully-controlled `<PrintConfigForm value={...} onChange={...} detectedPages={...} />` that exposes all 6 print options, validates `pageRange` client-side against `detectedPages`, and emits validation errors via `onValidChange`.

## 3. Files to Create / Modify

### Modify (stub)
- `apps/mobile/src/components/shared/PrintConfigForm.tsx`

### Create
- `apps/mobile/src/components/shared/__tests__/PrintConfigForm.test.tsx`
- `apps/mobile/src/utils/pageRange.ts` — `parsePageRange(rangeStr, totalPages): number[]` and `isValidPageRange(rangeStr, totalPages): boolean`
- `apps/mobile/src/utils/__tests__/pageRange.test.ts`

### Read first
- `packages/shared/src/constants/printConfig.ts` — enum values
- `packages/shared/src/types/order.types.ts` — `PrintConfig` shape (add if missing)
- [`AGENTS.md`](../../AGENTS.md) — components, Pressable, no falsy `&&`
- [`apps/mobile/src/components/ui/Button/Button.tsx`](../../apps/mobile/src/components/ui/Button/Button.tsx) — compound component pattern

## 4. Implementation Rules

### Component contract

```tsx
type PrintConfig = {
  colorMode: 'COLOR' | 'BW';
  paperSize: 'A4' | 'A3' | 'LETTER';
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  copies: number;        // ≥ 1
  duplex: boolean;
  pageRange: string | null; // null = print all pages
};

type PrintConfigFormProps = {
  value: PrintConfig;
  detectedPages: number | null;  // null for non-PDF
  manualPages: number | null;    // user-entered for non-PDF
  onChange: (next: PrintConfig) => void;
  onValidChange?: (isValid: boolean, error?: string) => void;
};
```

### Layout (top to bottom)
1. **Color mode toggle** — two pill buttons: COLOR, B&W.
2. **Paper size segmented control** — A4, A3, LETTER.
3. **Orientation toggle** — Portrait, Landscape.
4. **Copies stepper** — `−` / `1` / `+` controls. Min 1, max 100. Read-only number in middle.
5. **Duplex switch** — toggle.
6. **Page range input** — text input with helper text "e.g. 1-5,7,9-11" and hint "X pages detected" when `detectedPages` (or `manualPages`) known.

### Page range validation (client-side)
- Empty string or null → all pages, valid.
- Format: comma-separated tokens; each token is either `N` or `N-M` (M ≥ N).
- Parse to integer array; all numbers must be ≥ 1 and ≤ `detectedPages ?? manualPages`.
- If `detectedPages` AND `manualPages` are both null, accept any positive integers (the server is the final authority).
- Invalid → call `onValidChange(false, error)`; show inline error under the input.

### `parsePageRange(rangeStr, totalPages)` helper
```ts
// Returns ordered, deduplicated array of page numbers.
// Throws if invalid.
parsePageRange('1-3,5', 10) // → [1, 2, 3, 5]
parsePageRange('1-3,2,5', 10) // → [1, 2, 3, 5]
parsePageRange('1-15', 10) // → throws 'Page 15 exceeds total 10'
parsePageRange('abc', 10) // → throws 'Invalid format'
```

### Rules
- **Fully controlled** — never internal state for value, only for UI nuances like the page-range error string.
- **Reset on `value` change from parent** — form is reactive.
- **No falsy `&&`** — use ternary or `!!detectedPages && <Hint />`.
- **i18n keys** — every label, e.g. `orders.printConfig.colorMode.color`.
- **Compound styling** — use the existing theme tokens (`colors`, `spacing`, `borderRadius`, `typography`).
- **A11y** — every button has `accessibilityLabel`.

## 5. Edge Cases

- **`detectedPages` is null (non-PDF) and `manualPages` is null** — page range validation only checks format, not bounds. (Server validates final.)
- **User types `0` or negative copies** — clamp to 1; never allow 0.
- **User types non-numeric in copies via long press / hardware keyboard** — `keyboardType="number-pad"`.
- **Page range with whitespace** `"1-3, 5"` — strip whitespace before parsing.
- **Page range `"1-3,2"`** — accept (overlap allowed; server dedups).
- **Page range `"5-3"`** — invalid (reverse range).
- **A3 selection** — surcharges visible? No, that's purely a price-side concern. Form does not show surcharge math.
- **PDF detected as 1 page, user enters `"1-2"`** — invalid; show inline error.

## 6. Test Cases

### `parsePageRange` utility
1. `parsePageRange('1-3', 10)` returns `[1, 2, 3]`.
2. `parsePageRange('1,3,5', 10)` returns `[1, 3, 5]`.
3. `parsePageRange('1-3,5-7', 10)` returns `[1,2,3,5,6,7]`.
4. `parsePageRange('abc', 10)` throws.
5. `parsePageRange('1-15', 10)` throws.
6. `parsePageRange('', 10)` returns full range `[1..10]` (or treat empty as "all" — choose one and be consistent).
7. `parsePageRange('5-3', 10)` throws (reverse range).

### Component
8. Renders all six controls with values from props.
9. Tapping COLOR toggle calls `onChange` with `colorMode: 'COLOR'`.
10. Copies + button increments `copies`.
11. Copies − button at value 1 does nothing.
12. Entering invalid page range shows inline error and `onValidChange(false)`.
13. Entering valid page range clears error and `onValidChange(true)`.

## 7. Definition of Done

- [ ] `PrintConfigForm.tsx` fully implemented with 6 controls
- [ ] Controlled component contract honored
- [ ] `parsePageRange` utility + tests
- [ ] Inline error UX for page range
- [ ] All labels via translation keys
- [ ] A11y labels on every interactive element
- [ ] Component test passes
- [ ] No falsy `&&` patterns; no raw strings outside `<Text>`
- [ ] Branch `ihm/feat/print-config-form-mobile`; PR title `[Slice 10]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`packages/shared/src/constants/printConfig.ts`](../../packages/shared/src/constants/printConfig.ts) — enum values
   - [`AGENTS.md`](../../AGENTS.md)
   - [`apps/mobile/src/components/ui/Button/Button.tsx`](../../apps/mobile/src/components/ui/Button/Button.tsx)
2. **Write `parsePageRange` utility first.** Pure function, comprehensive tests.
3. **Build the form** top to bottom, one control at a time. Test each as you go.
4. **Use `useState` only for the page-range error string.** Everything else is from props.
5. **Test all six controls.**

### Gotchas

- Pickers in React Native: roll your own segmented control with `Pressable` rows; do not use a native picker.
- `keyboardType="number-pad"` for copies and page range, but copies validates against `parseInt`.
- Page range parsing: split on `,`, then split each on `-`, then parse.
- Never use a third-party form library for this component — keep it lean.

## 9. References

- [`docs/04-data-model.md`](../04-data-model.md) §OrderFile, §PrintConfig fields
- [`AGENTS.md`](../../AGENTS.md) §Compound components, §i18n
- [`CONTEXT.md`](../../CONTEXT.md) §Domain glossary §PrintConfig
