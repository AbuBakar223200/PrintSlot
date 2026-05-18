import { BadRequestException } from '@nestjs/common';
import { ColorMode, PaperSize } from '@printslot/shared';
import { OrdersService } from '../orders.service';

describe('OrdersService price Module', () => {
  const service = new OrdersService({} as never);
  const rates = {
    colorRate: '10',
    bwRate: '3',
    a3Surcharge: '5',
    duplexDiscount: '0.2',
  };

  it('calculates per-file subtotals and Order totals from server rates', () => {
    const result = service.calculatePrice(
      [
        {
          detectedPages: 10,
          colorMode: ColorMode.COLOR,
          paperSize: PaperSize.A4,
          copies: 2,
          duplex: true,
          pageRange: '1-3',
        },
        {
          detectedPages: 4,
          colorMode: ColorMode.BW,
          paperSize: PaperSize.A3,
          copies: 1,
          duplex: false,
        },
      ],
      rates,
    );

    expect(result).toEqual({
      files: [
        {
          resolvedPages: 3,
          subtotalPrice: 48,
          colorPages: 6,
          bwPages: 0,
        },
        {
          resolvedPages: 4,
          subtotalPrice: 32,
          colorPages: 0,
          bwPages: 4,
        },
      ],
      totalPrice: 80,
      totalPages: 10,
      colorPages: 6,
      bwPages: 4,
    });
  });

  it('deduplicates comma and range page selections', () => {
    const result = service.calculatePrice(
      [
        {
          detectedPages: 10,
          colorMode: ColorMode.BW,
          paperSize: PaperSize.A4,
          copies: 1,
          duplex: false,
          pageRange: '1, 3-5, 5',
        },
      ],
      rates,
    );

    expect(result.files[0].resolvedPages).toBe(4);
    expect(result.totalPrice).toBe(12);
  });

  it('rejects page ranges outside the detected page count', () => {
    expect(() =>
      service.calculatePrice(
        [
          {
            detectedPages: 2,
            colorMode: ColorMode.COLOR,
            paperSize: PaperSize.A4,
            copies: 1,
            duplex: false,
            pageRange: '1-3',
          },
        ],
        rates,
      ),
    ).toThrow(BadRequestException);
  });
});
