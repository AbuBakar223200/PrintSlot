import { z } from 'zod';
import { ColorMode, PaperSize, Orientation, PickupMode, PaymentMethod } from '@printslot/shared';

export const CreateOrderSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID format'),
  pickupMode: z.nativeEnum(PickupMode),
  slotId: z.string().uuid('Invalid slot ID format').optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  files: z.array(
    z.object({
      fileUrl: z.string().url('Invalid file URL'),
      fileName: z.string().min(1, 'File name is required'),
      mimeType: z.string().min(1, 'Mime type is required'),
      fileSize: z.number().int().positive('File size must be positive'),
      detectedPages: z.number().int().min(1, 'Detected pages must be at least 1'),
      colorMode: z.nativeEnum(ColorMode),
      paperSize: z.nativeEnum(PaperSize),
      orientation: z.nativeEnum(Orientation),
      copies: z.number().int().min(1, 'Copies must be at least 1'),
      duplex: z.boolean(),
      pageRange: z.string().nullable().optional(),
    })
  ).min(1, 'Must upload at least 1 file').max(10, 'Cannot upload more than 10 files'),
}).strict().refine(
  (data) => {
    if (data.pickupMode === PickupMode.SLOT && !data.slotId) {
      return false;
    }
    return true;
  },
  {
    message: 'slotId is required when pickupMode is SLOT',
    path: ['slotId'],
  }
);

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
