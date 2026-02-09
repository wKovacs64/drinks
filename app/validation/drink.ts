import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const drinkSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(slugPattern, 'Slug must be lowercase letters, numbers, and hyphens'),
  ingredients: z.array(z.string()).min(1, 'At least one ingredient is required'),
  calories: z.number().int('Calories must be a whole number').min(0, 'Calories cannot be negative'),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  notes: z.string().nullable(),
  rank: z.number().int('Rank must be a whole number'),
});
