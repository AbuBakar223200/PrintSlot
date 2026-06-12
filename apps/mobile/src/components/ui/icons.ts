/**
 * F3 — Icon system.
 *
 * `lucide-react-native` is the ONLY icon source (Fork 5). Emoji are banned.
 * This module codifies the fixed icon maps from spec §4 so the same OrderStatus,
 * notification type, or tab renders the same glyph everywhere — consistency is
 * what makes status instantly readable.
 *
 * Each map entry pairs:
 *   - `icon`    — the lucide component to render
 *   - `tone`    — the semantic tone key (drives color via the active theme)
 *   - `labelKey`— the i18n key for the screen-reader / a11y label (Fork 13: every
 *                 icon, IconButton, StatusBadge and unread dot needs a label)
 *
 * Consumers resolve `tone` → color through `useTheme().tones` and `labelKey`
 * through i18next; this module stays pure data + lucide components.
 */
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  Briefcase,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  Home,
  ListOrdered,
  Package,
  PackageCheck,
  Printer,
  Receipt,
  Settings,
  Store,
  UserPlus,
  Users,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { NotificationType, OrderStatus } from '@printslot/shared';
import type { ToneKey } from '@/theme/tokens';

export type { LucideIcon };

/** A status/notification/tab icon entry: glyph + tone + a11y label key. */
export interface IconMeta {
  icon: LucideIcon;
  tone: ToneKey;
  /** i18n key for the accessibility label. */
  labelKey: string;
}

/** §4.1 — StatusBadge: OrderStatus → semantic color + lucide icon. */
export const STATUS_ICONS: Record<OrderStatus, IconMeta> = {
  [OrderStatus.QUEUED]: { icon: ListOrdered, tone: 'info', labelKey: 'status.QUEUED' },
  [OrderStatus.SCHEDULED]: { icon: CalendarClock, tone: 'violet', labelKey: 'status.SCHEDULED' },
  [OrderStatus.PROCESSING]: { icon: Printer, tone: 'warn', labelKey: 'status.PROCESSING' },
  [OrderStatus.READY]: { icon: PackageCheck, tone: 'success', labelKey: 'status.READY' },
  [OrderStatus.COLLECTED]: { icon: CheckCheck, tone: 'muted', labelKey: 'status.COLLECTED' },
  [OrderStatus.CANCELLED]: { icon: XCircle, tone: 'error', labelKey: 'status.CANCELLED' },
};

/** §4.2 — Notification type → lucide icon (+ tone per the prototype NOTIF_META). */
export const NOTIFICATION_ICONS: Record<NotificationType, IconMeta> = {
  [NotificationType.ORDER_PLACED]: { icon: Printer, tone: 'info', labelKey: 'notif.title' },
  [NotificationType.ORDER_ACCEPTED]: { icon: Printer, tone: 'warn', labelKey: 'notif.title' },
  [NotificationType.ORDER_READY]: { icon: Printer, tone: 'success', labelKey: 'notif.title' },
  [NotificationType.ORDER_CANCELLED]: { icon: Printer, tone: 'error', labelKey: 'notif.title' },
  [NotificationType.NEW_ORDER]: { icon: ClipboardList, tone: 'info', labelKey: 'notif.title' },
  [NotificationType.WALLET_TOPUP]: { icon: Wallet, tone: 'success', labelKey: 'notif.title' },
  [NotificationType.WALLET_DEDUCTED]: { icon: Wallet, tone: 'warn', labelKey: 'notif.title' },
  [NotificationType.SHOP_APPROVED]: { icon: Store, tone: 'success', labelKey: 'notif.title' },
  [NotificationType.SHOP_REJECTED]: { icon: Store, tone: 'error', labelKey: 'notif.title' },
  [NotificationType.SHOP_SUSPENDED]: { icon: Store, tone: 'warn', labelKey: 'notif.title' },
  [NotificationType.STAFF_ASSIGNED]: { icon: UserPlus, tone: 'info', labelKey: 'notif.title' },
  [NotificationType.LOW_BALANCE]: { icon: AlertTriangle, tone: 'warn', labelKey: 'notif.title' },
};

/** A tab descriptor: glyph + the i18n key for its label. */
export interface TabIconMeta {
  icon: LucideIcon;
  labelKey: string;
}

/** §4.3 — Customer shell tabs (in order): Home · Orders · Wallet · Notifications. */
export const CUSTOMER_TAB_ICONS: readonly TabIconMeta[] = [
  { icon: Home, labelKey: 'tab.home' },
  { icon: Receipt, labelKey: 'tab.orders' },
  { icon: Wallet, labelKey: 'tab.wallet' },
  { icon: Bell, labelKey: 'tab.notifications' },
];

/** §4.3 — Owner shell tabs: Shop · Jobs · Slots · Staff · Analytics. */
export const OWNER_TAB_ICONS: readonly TabIconMeta[] = [
  { icon: Store, labelKey: 'tab.shop' },
  { icon: Briefcase, labelKey: 'tab.jobs' },
  { icon: CalendarClock, labelKey: 'tab.slots' },
  { icon: Users, labelKey: 'tab.staff' },
  { icon: BarChart3, labelKey: 'tab.analytics' },
];

/**
 * §4.3 — Admin shell tabs: Shops · Analytics · Config · Slot Templates.
 * Admin is the one role where the lucide `Settings` glyph is permissible —
 * it labels `AppConfig`, the only place "Settings" is the correct domain term.
 */
export const ADMIN_TAB_ICONS: readonly TabIconMeta[] = [
  { icon: Store, labelKey: 'tab.shops' },
  { icon: BarChart3, labelKey: 'tab.analytics' },
  { icon: Settings, labelKey: 'tab.config' },
  { icon: CalendarClock, labelKey: 'tab.templates' },
];

/** Wallet transaction direction icons (§8.9): CREDIT up/green, DEBIT down/red. */
export const TRANSACTION_ICONS = {
  CREDIT: { icon: ArrowUp, tone: 'success' as ToneKey },
  DEBIT: { icon: ArrowDown, tone: 'error' as ToneKey },
} as const;

/** Generic fallback glyph for empty/error states without a more specific icon. */
export const FallbackIcon: LucideIcon = Package;
