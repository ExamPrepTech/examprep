import { z } from 'zod';

export const testCreationSchema = z
  .object({
    spaceId: z.string().min(1, 'Pick a space'),
    subjectIds: z.array(z.string()).min(1, 'Pick at least one subject'),
    topicIds: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    questionCount: z.coerce.number().int().min(1, 'Minimum 1').max(500, 'Max 500'),
    durationMinutes: z.coerce.number().int().min(1, 'Minimum 1 minute').max(600, 'Max 600 min'),
    marksPerQuestion: z.coerce.number().min(0, 'No negatives'),
    negativeMarks: z.coerce.number().min(0, 'No negatives'),
  })
  .refine((d) => d.negativeMarks <= d.marksPerQuestion, {
    message: 'Negative marks cannot exceed marks per question',
    path: ['negativeMarks'],
  });

export type TestCreationValues = z.infer<typeof testCreationSchema>;
