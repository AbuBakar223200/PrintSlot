import { z } from 'zod';
import { TimeWindowSchema } from './create-slot-template.dto';

export const UpdateSlotTemplateSchema = z
  .object({
    startTime: TimeWindowSchema.optional(),
    endTime: TimeWindowSchema.optional(),
  })
  .strict()
  .refine((value) => value.startTime !== undefined || value.endTime !== undefined, {
    message: 'At least one field is required',
  });

export type UpdateSlotTemplateDto = z.infer<typeof UpdateSlotTemplateSchema>;
