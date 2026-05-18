import { z } from 'zod';
import { ColorMode, PaperSize } from '@printslot/shared';

export const PreviewPriceFileSchema = z.object({
  detectedPages: z.number().int().positive(),
  colorMode: z.nativeEnum(ColorMode),
  paperSize: z.nativeEnum(PaperSize),
  copies: z.number().int().positive(),
  duplex: z.boolean(),
  pageRange: z.string().trim().min(1).optional(),
}).strict();

export const PreviewPriceSchema = z.object({
  shopId: z.string().uuid(),
  files: z.array(PreviewPriceFileSchema).min(1).max(10),
}).strict();

export type PreviewPriceDto = z.infer<typeof PreviewPriceSchema>;
