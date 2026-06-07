export const slotPickerKeys = {
  today: 'slots.slotPicker.today',
  noSlots: 'slots.slotPicker.noSlots',
  loading: 'slots.slotPicker.loading',
  errorTitle: 'slots.slotPicker.errorTitle',
  errorBody: 'slots.slotPicker.errorBody',
  retry: 'slots.slotPicker.retry',
  remaining: 'slots.slotPicker.remaining',
  unknownTime: 'slots.slotPicker.unknownTime',
  weekdaySun: 'slots.weekday.sunShort',
  weekdayMon: 'slots.weekday.monShort',
  weekdayTue: 'slots.weekday.tueShort',
  weekdayWed: 'slots.weekday.wedShort',
  weekdayThu: 'slots.weekday.thuShort',
  weekdayFri: 'slots.weekday.friShort',
  weekdaySat: 'slots.weekday.satShort',
} as const;

type SlotPickerKey = typeof slotPickerKeys[keyof typeof slotPickerKeys];

const slotPickerFallbacks: Record<SlotPickerKey, string> = {
  [slotPickerKeys.today]: 'Today',
  [slotPickerKeys.noSlots]: 'No slots available for this date',
  [slotPickerKeys.loading]: 'Loading slots',
  [slotPickerKeys.errorTitle]: 'Could not load slots',
  [slotPickerKeys.errorBody]: 'Please try again in a moment.',
  [slotPickerKeys.retry]: 'Retry',
  [slotPickerKeys.remaining]: '{count} left',
  [slotPickerKeys.unknownTime]: 'Time unavailable',
  [slotPickerKeys.weekdaySun]: 'Sun',
  [slotPickerKeys.weekdayMon]: 'Mon',
  [slotPickerKeys.weekdayTue]: 'Tue',
  [slotPickerKeys.weekdayWed]: 'Wed',
  [slotPickerKeys.weekdayThu]: 'Thu',
  [slotPickerKeys.weekdayFri]: 'Fri',
  [slotPickerKeys.weekdaySat]: 'Sat',
};

const weekdayKeys = [
  slotPickerKeys.weekdaySun,
  slotPickerKeys.weekdayMon,
  slotPickerKeys.weekdayTue,
  slotPickerKeys.weekdayWed,
  slotPickerKeys.weekdayThu,
  slotPickerKeys.weekdayFri,
  slotPickerKeys.weekdaySat,
] as const;

export function weekdayShortKey(weekdayIndex: number): SlotPickerKey {
  return weekdayKeys[weekdayIndex] ?? slotPickerKeys.weekdaySun;
}

export function slotPickerText(
  key: SlotPickerKey,
  values?: { count?: number },
): string {
  const template = slotPickerFallbacks[key];

  if (values?.count !== undefined) {
    return template.replace('{count}', String(values.count));
  }

  return template;
}
