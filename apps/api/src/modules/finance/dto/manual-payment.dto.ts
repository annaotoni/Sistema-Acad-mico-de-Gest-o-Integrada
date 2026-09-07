import { z } from 'zod';

export const ManualPaymentSchema = z.object({
  method: z.enum(['PIX', 'BOLETO']),
  amount: z.number().positive(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export type ManualPaymentDto = z.infer<typeof ManualPaymentSchema>;
