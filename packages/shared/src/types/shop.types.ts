import type { ShopStatus } from '../constants/roles';

export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  status: ShopStatus;
  rejectionReason: string | null;
  ownerId: string;
  colorRate: number;
  bwRate: number;
  a3Surcharge: number;
  duplexDiscount: number;
  defaultProcessingMins: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShopListResult {
  items: Shop[];
  total: number;
  page: number;
  limit: number;
}
