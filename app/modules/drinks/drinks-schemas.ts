import { enum_, object, string } from "remix/data-schema";
import tagSlug from "lodash-es/kebabCase.js";
export const drinkStatusValues = ["published", "unpublished"] as const;
const trimmedString = string().transform((value) => value.trim());
const integerString = (message: string) =>
  string()
    .transform((value) => Number.parseInt(value, 10))
    .refine(Number.isSafeInteger, message);
export const drinkDraftSchema = object({
  title: trimmedString.refine((value) => value.length > 0, "Title is required"),
  slug: trimmedString
    .refine((value) => value.length > 0, "Slug is required")
    .refine(
      (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      "Slug must be lowercase letters, numbers, and hyphens",
    ),
  ingredients: string()
    .transform((value) =>
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .refine((value) => value.length > 0, "At least one ingredient is required"),
  calories: integerString("Calories must be a whole number").refine(
    (value) => value >= 0,
    "Calories cannot be negative",
  ),
  tags: string()
    .transform((value) =>
      [...new Set(value.split(",").map(tagSlug).filter(Boolean))].map((slug) =>
        slug.replaceAll("-", " "),
      ),
    )
    .refine((value) => value.length > 0, "At least one tag is required"),
  notes: trimmedString.transform((value) => value || null),
  rank: integerString("Rank must be a whole number"),
  status: enum_(drinkStatusValues),
});
