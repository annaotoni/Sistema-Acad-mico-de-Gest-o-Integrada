import { z } from 'zod';

export const CreateLiveClassSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().min(1).max(200),
  scheduledAt: z.string().datetime(),
  videoLink: z.string().url().optional(),
});

export type CreateLiveClassDto = z.infer<typeof CreateLiveClassSchema>;
