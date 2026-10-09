import { z } from "zod";

export const recipeSchema = z.object({
  title: z.string(),
  slug: z.string(),
  ingredients: z.array(z.string()),
  calories: z.number(),
  notes: z.string().nullable().describe("Full existing recipe notes/instructions, as HTML."),
  imageUrl: z.url(),
  sourceUrl: z.url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
});
export const drinkResultSchema = z.object({ drink: recipeSchema });
