/**
 * Slot template — global time window managed by Platform Admin.
 * Duration is governed by AppConfig.SLOT_DURATION_MINS, not stored here.
 */
export interface SlotTemplate {
  id: string;
  startTime: string;
  endTime: string;
  deletedAt: string | null;
  createdAt: string;
}

/**
 * A shop's slot for a specific date, created from a SlotTemplate.
 * `GET /shops/:id/slots/active` returns the slot whose BST time window
 * contains the current moment, or `null` when none is active.
 */
export interface ShopSlot {
  id: string;
  shopId: string;
  templateId: string;
  date: string;
  isOpen: boolean;
  maxOrders: number;
  currentCount: number;
  template?: SlotTemplate;
}
