/**
 * Date chips for the owner Slots screen. The prototype shows Today, +1, +2, +3;
 * we render the same four offsets and resolve each to an ISO `YYYY-MM-DD` for the
 * slots endpoints.
 */
export interface SlotDateOption {
  /** ISO `YYYY-MM-DD` passed to the slots API. */
  iso: string;
  /** Day offset from today (0 = today). */
  offset: number;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Build the four date options (today + next three days). */
export function buildSlotDateOptions(now: Date = new Date()): SlotDateOption[] {
  return [0, 1, 2, 3].map((offset) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return { iso: toIso(date), offset };
  });
}
