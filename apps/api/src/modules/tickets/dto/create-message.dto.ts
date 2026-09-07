import { z } from 'zod';

export const CreateMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export type CreateMessageDto = z.infer<typeof CreateMessageSchema>;
