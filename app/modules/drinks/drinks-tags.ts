import slugify from "@sindresorhus/slugify";
import type { DrinkTagView } from "./drinks-contract.ts";

/**
 * Canonical Tags: slugify, drop empty slugs, keep the first Tag per Tag slug, and derive the
 * Tag display name from the Tag slug. Drink drafts store the display names.
 */
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
