import { PreviewPriceSchema } from '../dto/preview-price.dto';

describe('PreviewPriceSchema', () => {
  const validPayload = {
    shopId: '11111111-1111-4111-8111-111111111111',
    files: [
      {
        detectedPages: 3,
        colorMode: 'COLOR',
        paperSize: 'A4',
        copies: 1,
        duplex: false,
      },
    ],
  };

  it('rejects client-supplied server-computed price fields', () => {
    const result = PreviewPriceSchema.safeParse({
      ...validPayload,
      totalPrice: 10,
    });

    expect(result.success).toBe(false);
  });

  it('rejects client-supplied resolvedPages and subtotalPrice on files', () => {
    const result = PreviewPriceSchema.safeParse({
      ...validPayload,
      files: [
        {
          ...validPayload.files[0],
          resolvedPages: 3,
          subtotalPrice: 10,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
