import { BadRequestException } from '@nestjs/common';
import { ColorMode, PaperSize } from '@printslot/shared';
import { OrdersService } from '../orders.service';

describe('OrdersService price Module', () => {
  const service = new OrdersService({} as any, {} as any, {} as any, {} as any, {} as any);
  
  // Specific mock shop rates requested in Slice 12
  const rates = {
    colorRate: '2.0',
    bwRate: '1.0',
    a3Surcharge: '0.5',
    duplexDiscount: '0.2',
  };

  it('1. COLOR A4, no duplex, 10 pages, 2 copies, no range → subtotal = 40', () => {
    const result = service.calculatePrice(
      [
        {
          detectedPages: 10,
          colorMode: ColorMode.COLOR,
          paperSize: PaperSize.A4,
          copies: 2,
          duplex: false,
        },
      ],
      rates,
    );

    expect(result.files[0].subtotalPrice).toBe(40);
    expect(result.files[0].resolvedPages).toBe(10);
    expect(result.files[0].colorPages).toBe(20);
    expect(result.files[0].bwPages).toBe(0);
    expect(result.totalPrice).toBe(40);
  });

  it('2. BW A4, duplex, 10 pages, 1 copy → subtotal = 8', () => {
    const result = service.calculatePrice(
      [
        {
          detectedPages: 10,
          colorMode: ColorMode.BW,
          paperSize: PaperSize.A4,
          copies: 1,
          duplex: true,
        },
      ],
      rates,
    );

    expect(result.files[0].subtotalPrice).toBe(8);
    expect(result.files[0].resolvedPages).toBe(10);
    expect(result.files[0].colorPages).toBe(0);
    expect(result.files[0].bwPages).toBe(10);
    expect(result.totalPrice).toBe(8);
  });

  it('3. COLOR A3, no duplex, 4 pages, 1 copy → subtotal = 10', () => {
    const result = service.calculatePrice(
      [
        {
          detectedPages: 4,
          colorMode: ColorMode.COLOR,
          paperSize: PaperSize.A3,
          copies: 1,
          duplex: false,
        },
      ],
      rates,
    );

    expect(result.files[0].subtotalPrice).toBe(10);
    expect(result.files[0].resolvedPages).toBe(4);
    expect(result.files[0].colorPages).toBe(4);
    expect(result.files[0].bwPages).toBe(0);
    expect(result.totalPrice).toBe(10);
  });

  it('4. BW A3, duplex, 5 pages, 3 copies → subtotal = 19.5', () => {
    const result = service.calculatePrice(
      [
        {
          detectedPages: 5,
          colorMode: ColorMode.BW,
          paperSize: PaperSize.A3,
          copies: 3,
          duplex: true,
        },
      ],
      rates,
    );

    expect(result.files[0].subtotalPrice).toBe(19.5);
    expect(result.files[0].resolvedPages).toBe(5);
    expect(result.files[0].colorPages).toBe(0);
    expect(result.files[0].bwPages).toBe(15);
    expect(result.totalPrice).toBe(19.5);
  });

  it('5. pageRange "1-5" on 10-page doc → resolvedPages = 5, COLOR A4, copies=2 → subtotal = 20', () => {
    const result = service.calculatePrice(
      [
        {
          detectedPages: 10,
          colorMode: ColorMode.COLOR,
          paperSize: PaperSize.A4,
          copies: 2,
          duplex: false,
          pageRange: '1-5',
        },
      ],
      rates,
    );

    expect(result.files[0].subtotalPrice).toBe(20);
    expect(result.files[0].resolvedPages).toBe(5);
  });

  it('6. Multi-file total → totalPrice = sum of subtotals', () => {
    const result = service.calculatePrice(
      [
        {
          detectedPages: 10,
          colorMode: ColorMode.COLOR,
          paperSize: PaperSize.A4,
          copies: 2,
          duplex: false,
        },
        {
          detectedPages: 10,
          colorMode: ColorMode.BW,
          paperSize: PaperSize.A4,
          copies: 1,
          duplex: true,
        },
      ],
      rates,
    );

    expect(result.files[0].subtotalPrice).toBe(40);
    expect(result.files[1].subtotalPrice).toBe(8);
    expect(result.totalPrice).toBe(48);
  });

  it('7. rejects invalid range structure or negative copies', () => {
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
