import { z } from 'zod';

export const ReviewDocumentSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional(),
});

export type ReviewDocumentDto = z.infer<typeof ReviewDocumentSchema>;
