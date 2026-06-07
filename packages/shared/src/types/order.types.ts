import { OrderStatus } from '../constants/orderStatus';
import { PaymentMethod, PickupMode } from '../constants/roles';
import { ColorMode, Orientation, PaperSize } from '../constants/printConfig';

export interface PrintConfig {
  colorMode: ColorMode;
  paperSize: PaperSize;
  orientation: Orientation;
  copies: number;
  duplex: boolean;
  pageRange: string | null;
}

export interface PreviewPriceFileInput {
  detectedPages: number;
  colorMode: ColorMode;
  paperSize: PaperSize;
  copies: number;
  duplex: boolean;
  pageRange?: string;
}

export interface PreviewPriceInput {
  shopId: string;
  files: PreviewPriceFileInput[];
}

export interface CreateOrderFileInput extends PrintConfig {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  detectedPages: number;
}

export interface CreateOrderInput {
  shopId: string;
  pickupMode: PickupMode;
  slotId?: string;
  paymentMethod: PaymentMethod;
  files: CreateOrderFileInput[];
}

export interface OrderFile extends CreateOrderFileInput {
  id: string;
  orderId: string;
  resolvedPages: number;
  subtotalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  shopId: string;
  pickupMode: PickupMode;
  slotId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalPages: number;
  colorPages: number;
  bwPages: number;
  totalPrice: number;
  processingStartedAt: string | null;
  readyAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  orderFiles: OrderFile[];
}
