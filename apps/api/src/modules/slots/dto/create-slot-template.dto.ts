import { z } from 'zod';

export const TimeWindowSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM time');

export const CreateSlotTemplateSchema = z
  .object({
    startTime: TimeWindowSchema,
    endTime: TimeWindowSchema,
  })
  .strict();

export type CreateSlotTemplateDto = z.infer<typeof CreateSlotTemplateSchema>;
