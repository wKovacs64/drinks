import slugify from "@sindresorhus/slugify";
import type { DrinkTagView } from "./drinks.ts";

export function toDrinkTagViews(tags: string[]): DrinkTagView[] {
  const tagViewsBySlug = new Map<string, DrinkTagView>();

  for (const tag of tags) {
    const slug = slugify(tag);

    if (!slug || tagViewsBySlug.has(slug)) {
      continue;
    }

    tagViewsBySlug.set(slug, { displayName: slug.replaceAll("-", " "), slug });
  }

  return Array.from(tagViewsBySlug.values());
}
