import { z } from 'zod';

export const CreateTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
});

export type CreateTicketDto = z.infer<typeof CreateTicketSchema>;
