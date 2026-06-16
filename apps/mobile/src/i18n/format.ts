/**
 * F6 — locale-aware formatting utilities.
 *
 * Fork 11: in BN mode, money / counts / dates / ETA / queue render in full
 * Bengali numerals (১২৩); `OrderNumber` (`PS-XXXXX`) stays ASCII always.
 *
 * We map digits manually rather than via `Intl.NumberFormat('bn-BD')` because
 * Hermes ships limited ICU locale data on Android — manual mapping is
 * deterministic across every device. These helpers are pure + module-scoped.
 */
import { Language } from '@printslot/shared';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Map ASCII digits in a value to Bengali numerals when language is BN. */
export function localizeDigits(value: string | number, language: Language): string {
  const s = String(value);
  return language === Language.BN ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : s;
}

/** Plain integer/number, digit-localized. */
export function formatNumber(n: number, language: Language): string {
  return localizeDigits(String(n), language);
}

/**
 * Currency: ৳ + amount with locale digits. Integers show no decimals, non-integers
 * show 2 — matching the prototype `money()`. Pass `decimals` to force.
 */
export function formatMoney(n: number, language: Language, decimals?: 0 | 2): string {
  const d = decimals ?? (Number.isInteger(n) ? 0 : 2);
  return '৳' + localizeDigits(Number(n).toFixed(d), language);
}

/** Compact relative time ("20m ago" / "২০ মিনিট আগে"). */
export function formatRelative(iso: string, language: Language): string {
  const bn = language === Language.BN;
  const then = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (diffMin < 1) return bn ? 'এইমাত্র' : 'just now';
  if (diffMin < 60) return localizeDigits(diffMin, language) + (bn ? ' মিনিট আগে' : 'm ago');
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return localizeDigits(diffH, language) + (bn ? ' ঘণ্টা আগে' : 'h ago');
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return bn ? 'গতকাল' : 'yesterday';
  return localizeDigits(diffD, language) + (bn ? ' দিন আগে' : 'd ago');
}
