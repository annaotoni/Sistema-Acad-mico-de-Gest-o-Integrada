import { z } from 'zod';

export const CreateInvoiceSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  description: z.string().min(1).max(255),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;
