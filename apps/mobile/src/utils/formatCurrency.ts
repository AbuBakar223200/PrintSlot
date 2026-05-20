// Hoisted to module scope — never construct Intl formatters inside render.
const bdtFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a BDT amount with the Taka sign, e.g. 12 → "৳12.00".
 * Numbers stay Arabic numerals regardless of UI language.
 */
export function formatCurrency(amount: number): string {
  return `৳${bdtFormatter.format(Number(amount))}`;
}
