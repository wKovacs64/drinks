import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates a pre-parsed drink object (arrays and numbers already resolved).
 * Used by drinkFormSchema's pipeline — not intended for direct use.
 */
const drinkObjectSchema = z.object({
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

/**
 * Accepts raw form strings (newline-delimited ingredients, comma-separated
 * tags, string numbers) and transforms them into validated drink data.
 */
export const drinkSchema = z
  .object({
    title: z.string(),
    slug: z.string(),
    ingredients: z.string(),
    calories: z.string(),
    tags: z.string(),
    notes: z.string(),
    rank: z.string(),
  })
  .transform((raw) => ({
    title: raw.title,
    slug: raw.slug,
    ingredients: raw.ingredients
      .split('\n')
      .map((ingredient) => ingredient.trim())
      .filter(Boolean),
    calories: Number.parseInt(raw.calories, 10),
    tags: raw.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    notes: raw.notes || null,
    rank: Number.parseInt(raw.rank, 10) || 0,
  }))
  .pipe(drinkObjectSchema);
