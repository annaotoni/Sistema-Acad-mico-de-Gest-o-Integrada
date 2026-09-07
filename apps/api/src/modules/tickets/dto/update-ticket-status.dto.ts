import { z } from 'zod';
import { TicketStatus } from '@prisma/client';

export const UpdateTicketStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});

export type UpdateTicketStatusDto = z.infer<typeof UpdateTicketStatusSchema>;
