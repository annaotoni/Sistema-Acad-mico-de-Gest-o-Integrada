import { z } from 'zod';

export const RequestDocumentSchema = z.object({
  type: z.string().min(1).max(100),
  notes: z.string().max(500).optional(),
});

export type RequestDocumentDto = z.infer<typeof RequestDocumentSchema>;
