import { z } from 'zod';

export const RegisterDeviceSchema = z
  .object({
    token: z.string().min(1),
    deviceId: z.string().min(1),
  })
  .strict();

export type RegisterDeviceDto = z.infer<typeof RegisterDeviceSchema>;
