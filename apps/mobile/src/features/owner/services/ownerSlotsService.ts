import type { Slot, SlotTemplate } from '@printslot/shared';
import { apiFetch } from '@/services/api';

/** A management view of one slot for a date: the template window + its config. */
export interface ManagedSlot {
  templateId: string;
  /** Display window, e.g. "09:00–09:30". */
  time: string;
  startTime: string;
  isOpen: boolean;
  maxOrders: number;
  used: number;
}

/** Upsert body for `POST /shops/:id/slots`. */
export interface UpsertSlotInput {
  shopId: string;
  templateId: string;
  date: string;
  isOpen: boolean;
  maxOrders: number;
}

const DEFAULT_MAX_ORDERS = 10;

function windowLabel(template: SlotTemplate): string {
  return `${template.startTime}–${template.endTime}`;
}

export const ownerSlotsService = {
  /**
   * Build the full management list for a date. `GET /shops/:id/slots` only returns
   * OPEN, non-full slots, so we merge it against every active `SlotTemplate`: a
   * template with no matching open slot renders as closed (max from the slot row
   * when present, else the shop default).
   */
  async listManagedSlots(shopId: string, date: string): Promise<ManagedSlot[]> {
    const [templates, openSlots] = await Promise.all([
      apiFetch<SlotTemplate[]>('/slots/templates'),
      apiFetch<Slot[]>(`/shops/${shopId}/slots?date=${encodeURIComponent(date)}`),
    ]);

    const openByTemplate = new Map<string, Slot>();
    for (const slot of openSlots) openByTemplate.set(slot.templateId, slot);

    return templates
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((template) => {
        const slot = openByTemplate.get(template.id);
        return {
          templateId: template.id,
          time: windowLabel(template),
          startTime: template.startTime,
          isOpen: slot ? slot.isOpen : false,
          maxOrders: slot ? slot.maxOrders : DEFAULT_MAX_ORDERS,
          used: slot ? slot.currentCount : 0,
        };
      });
  },

  /** Upsert a slot's open/closed flag + max orders for a date. */
  upsertSlot({ shopId, templateId, date, isOpen, maxOrders }: UpsertSlotInput): Promise<Slot> {
    return apiFetch<Slot>(`/shops/${shopId}/slots`, {
      method: 'POST',
      body: JSON.stringify({ templateId, date, isOpen, maxOrders }),
    });
  },
};
