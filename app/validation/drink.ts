import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const trimmedString = z.string().transform((value) => value.trim());

const newlineSeparatedList = z.string().transform((value) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean),
);

const commaSeparatedList = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
);

const intFromString = z.string().transform((value) => Number.parseInt(value, 10));

export const drinkFormSchema = z.object({
  title: trimmedString.pipe(z.string().min(1, 'Title is required')),
  slug: trimmedString.pipe(
    z
      .string()
      .min(1, 'Slug is required')
      .regex(slugPattern, 'Slug must be lowercase letters, numbers, and hyphens'),
  ),
  ingredients: newlineSeparatedList.pipe(
    z.array(z.string()).min(1, 'At least one ingredient is required'),
  ),
  calories: intFromString.pipe(
    z.int('Calories must be a whole number').min(0, 'Calories cannot be negative'),
  ),
  tags: commaSeparatedList.pipe(z.array(z.string()).min(1, 'At least one tag is required')),
  notes: trimmedString.transform((value) => value || null),
  rank: intFromString.pipe(z.int('Rank must be a whole number')),
});
