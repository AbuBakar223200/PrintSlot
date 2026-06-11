<!--
  PrintSlot pull request template.
  Target branch should be `development` (not `main`) for feature work.
-->

## Summary

<!-- What does this PR do and why? One or two sentences. -->

## Changes

<!-- Bullet the notable changes. -->

-

## Testing

<!-- How was this verified? Unit/e2e tests, manual steps, screenshots. -->

-

## 🎨 UI/UX Design Spec Compliance (mobile PRs)

<!-- Only applies if this PR touches `apps/mobile/**`. Delete this section for API/docs-only PRs. -->

If this PR implements or changes mobile UI, confirm it conforms to [docs/09-ui-ux-design-spec.md](../docs/09-ui-ux-design-spec.md):

- [ ] Semantic theme tokens via the theme hook — no raw hex in screens/components
- [ ] Icons are `lucide-react-native` — NO emoji icons
- [ ] Text uses the `Text` primitive (Inter / Hind Siliguri); money uses `MoneyText` (৳, tabular figures)
- [ ] Light + dark both handled via semantic tokens (no hardcoded light/dark)
- [ ] Composes existing UI primitives (Card/FrostCard/Screen/Sheet/Banner/Skeleton/EmptyState/Chip/SegmentedControl/Stepper/StatusBadge/…) — no bespoke one-off pills/cards
- [ ] Frost (expo-blur) only on hero zones; list rows + dense data use SOLID cards (never blurred per-row)
- [ ] All four states: skeleton loading, lucide icon-empty + CTA, inline error + Retry, app-wide offline Banner (mutations blocked offline)
- [ ] Motion restrained: no per-row list entrance; press-scale 0.97; meaningful transitions only; reduce-motion respected
- [ ] Lists use FlashList (never ScrollView + .map); rows are light (no queries/context inside rows)
- [ ] Native `<Modal presentationStyle="formSheet">` via the `Sheet` primitive — NO JS bottom-sheet library; menus via `zeego`
- [ ] All user-visible strings use i18n keys (EN + BN); BN renders Bengali numerals (১২৩) via the locale formatters; OrderNumber `PS-XXXXX` stays ASCII
- [ ] Accessibility: WCAG AA contrast, 44×44 touch targets, screen-reader labels on icons/IconButton/StatusBadge/unread dots
- [ ] Navigation via expo-router `router.push/replace` (no `useNavigation()`); role guards in `_layout.tsx`
- [ ] No `@prisma/client` import in mobile; server data only via TanStack Query (not Zustand)
- [ ] OrderNumber (`PS-XXXXX`) shown to users; UUID only in API calls/routes
- [ ] Price is server-calculated (never send totalPrice/subtotalPrice from client)

Full per-screen spec & rationale: [docs/09-ui-ux-design-spec.md](../docs/09-ui-ux-design-spec.md).
