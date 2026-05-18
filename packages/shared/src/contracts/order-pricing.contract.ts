import type { ColorMode, PaperSize } from '../constants/printConfig';

export interface PriceableOrderFileInput {
  detectedPages: number;
  colorMode: ColorMode;
  paperSize: PaperSize;
  copies: number;
  duplex: boolean;
  pageRange?: string;
}

export interface ShopPriceRates {
  colorRate: number | string;
  bwRate: number | string;
  a3Surcharge: number | string;
  duplexDiscount: number | string;
}

export interface PricedOrderFile {
  resolvedPages: number;
  subtotalPrice: number;
  colorPages: number;
  bwPages: number;
}

export interface OrderPriceResult {
  files: PricedOrderFile[];
  totalPrice: number;
  totalPages: number;
  colorPages: number;
  bwPages: number;
}
