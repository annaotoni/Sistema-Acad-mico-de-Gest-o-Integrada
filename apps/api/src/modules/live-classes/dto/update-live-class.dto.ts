import { z } from 'zod';
import { LiveClassStatus } from '@prisma/client';

export const UpdateLiveClassSchema = z.object({
  videoLink: z.string().url().optional(),
  status: z.nativeEnum(LiveClassStatus).optional(),
  recordingUrl: z.string().url().optional(),
});

export type UpdateLiveClassDto = z.infer<typeof UpdateLiveClassSchema>;
