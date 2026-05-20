export interface SlotTemplate {
  id: string;
  startTime: string;
  endTime: string;
  deletedAt: string | null;
  createdAt: string;
}

export interface Slot {
  id: string;
  shopId: string;
  templateId: string;
  date: string;
  isOpen: boolean;
  maxOrders: number;
  currentCount: number;
  template: SlotTemplate;
}
