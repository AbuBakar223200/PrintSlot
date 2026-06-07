import {
  ColorMode,
  Orientation,
  PaperSize,
  PaymentMethod,
  PickupMode,
  type CreateOrderInput,
  type Order,
  type OrderPriceResult,
  OrderStatus,
  type PreviewPriceInput,
} from '@printslot/shared';
import { apiFetch } from '@/services/api';
import { orderService } from '../services/orderService';

jest.mock('@/services/api', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;

const previewInput: PreviewPriceInput = {
  shopId: '11111111-1111-4111-8111-111111111111',
  files: [
    {
      detectedPages: 5,
      colorMode: ColorMode.COLOR,
      paperSize: PaperSize.A4,
      copies: 1,
      duplex: false,
      pageRange: '1-3',
    },
  ],
};

const createInput: CreateOrderInput = {
  shopId: '11111111-1111-4111-8111-111111111111',
  pickupMode: PickupMode.SLOT,
  slotId: '22222222-2222-4222-8222-222222222222',
  paymentMethod: PaymentMethod.WALLET,
  files: [
    {
      fileUrl: 'https://cdn.test/doc.pdf',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      detectedPages: 5,
      colorMode: ColorMode.COLOR,
      paperSize: PaperSize.A4,
      orientation: Orientation.PORTRAIT,
      copies: 1,
      duplex: false,
      pageRange: null,
    },
  ],
};

const priceResult: OrderPriceResult = {
  files: [
    {
      resolvedPages: 3,
      subtotalPrice: 30,
      colorPages: 3,
      bwPages: 0,
    },
  ],
  totalPrice: 30,
  totalPages: 3,
  colorPages: 3,
  bwPages: 0,
};

const order: Order = {
  id: 'order-1',
  orderNumber: 'PS-00042',
  customerId: 'customer-1',
  shopId: createInput.shopId,
  pickupMode: PickupMode.SLOT,
  slotId: createInput.slotId ?? '',
  status: OrderStatus.SCHEDULED,
  paymentMethod: PaymentMethod.WALLET,
  totalPages: 3,
  colorPages: 3,
  bwPages: 0,
  totalPrice: 30,
  processingStartedAt: null,
  readyAt: null,
  cancelledAt: null,
  createdAt: '2026-06-07T00:00:00.000Z',
  updatedAt: '2026-06-07T00:00:00.000Z',
  orderFiles: [
    {
      id: 'order-file-1',
      orderId: 'order-1',
      resolvedPages: 3,
      subtotalPrice: 30,
      ...createInput.files[0],
    },
  ],
};

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('orderService', () => {
  it('previewPrice posts to /orders/preview-price with the preview DTO body', async () => {
    mockApiFetch.mockResolvedValueOnce(priceResult);

    await expect(orderService.previewPrice(previewInput)).resolves.toEqual(priceResult);

    expect(mockApiFetch).toHaveBeenCalledWith('/orders/preview-price', {
      method: 'POST',
      body: JSON.stringify(previewInput),
    });
  });

  it('createOrder posts to /orders without computed price fields', async () => {
    mockApiFetch.mockResolvedValueOnce(order);

    await expect(orderService.createOrder(createInput)).resolves.toEqual(order);

    expect(mockApiFetch).toHaveBeenCalledWith('/orders', {
      method: 'POST',
      body: JSON.stringify(createInput),
    });
    expect(JSON.parse((mockApiFetch.mock.calls[0][1] as RequestInit).body as string))
      .not.toHaveProperty('totalPrice');
  });
});
