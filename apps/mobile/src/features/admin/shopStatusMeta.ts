import { BadgeCheck, Clock, Pause, XCircle, type LucideIcon } from 'lucide-react-native';
import { ShopStatus } from '@printslot/shared';
import type { ToneKey } from '@/theme/tokens';

/**
 * Shop-status → tinted-badge tone + lucide glyph (prototype `adminShopRow`
 * `statusBadge`/`ic` maps). This is a SHOP status, NOT an OrderStatus — it is
 * rendered with a tinted badge using the theme tones (success/warn/error), never
 * `StatusBadge` (which owns OrderStatus).
 */
export const SHOP_STATUS_META: Record<ShopStatus, { tone: ToneKey; icon: LucideIcon }> = {
  [ShopStatus.ACTIVE]: { tone: 'success', icon: BadgeCheck },
  [ShopStatus.PENDING]: { tone: 'warn', icon: Clock },
  [ShopStatus.SUSPENDED]: { tone: 'warn', icon: Pause },
  [ShopStatus.REJECTED]: { tone: 'error', icon: XCircle },
};
