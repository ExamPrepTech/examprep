import { z } from 'zod';

const baseBlockSchema = z.object({
  explanation: z.string().optional(),
  notes: z.string().optional(),
  hints: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const noteBlockSchema = baseBlockSchema.extend({
  kind: z.literal('note'),
  content: z.string().min(1, 'Note content is required'),
});
export type NoteBlockValues = z.infer<typeof noteBlockSchema>;

const mcqOption = z.object({
  id: z.string(),
  text: z.string().min(1, 'Option text required'),
  isCorrect: z.boolean().default(false),
});

export const mcqBlockSchema = baseBlockSchema
  .extend({
    kind: z.enum(['mcq-single', 'mcq-multi']),
    question: z.string().min(1, 'Question is required'),
    options: z.array(mcqOption).min(2, 'At least two options'),
  })
  .refine((d) => d.options.some((o) => o.isCorrect), {
    message: 'Mark at least one correct option',
    path: ['options'],
  })
  .refine(
    (d) => (d.kind === 'mcq-single' ? d.options.filter((o) => o.isCorrect).length === 1 : true),
    { message: 'Single-MCQ allows exactly one correct option', path: ['options'] },
  );
export type McqBlockValues = z.infer<typeof mcqBlockSchema>;

export const fillBlockSchema = baseBlockSchema.extend({
  kind: z.literal('fill-blank'),
  /** Use [answer] tokens inline. */
  template: z.string().min(1, 'Template is required').includes('[', {
    message: 'Use [answer] placeholders for blanks',
  }),
});
export type FillBlockValues = z.infer<typeof fillBlockSchema>;
