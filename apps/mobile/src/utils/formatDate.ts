export interface DateChipOption {
  date: string;
  dayOfMonth: string;
  isToday: boolean;
  weekdayIndex: number;
}

function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}`;
}

export function addLocalDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getDateChipOptions(
  count = 4,
  baseDate = new Date(),
): DateChipOption[] {
  const today = startOfLocalDay(baseDate);

  return Array.from({ length: count }, (_, index) => {
    const date = addLocalDays(today, index);

    return {
      date: formatLocalDate(date),
      dayOfMonth: String(date.getDate()),
      isToday: index === 0,
      weekdayIndex: date.getDay(),
    };
  });
}
