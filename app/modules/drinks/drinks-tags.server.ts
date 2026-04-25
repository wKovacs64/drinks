import { kebabCase } from "lodash-es";
import type { DrinkTagView } from "./drinks";

export function toDrinkTagViews(tags: string[]): DrinkTagView[] {
  const tagViewsBySlug = new Map<string, DrinkTagView>();

  for (const tag of tags) {
    const slug = kebabCase(tag);

    if (!slug || tagViewsBySlug.has(slug)) {
      continue;
    }

    tagViewsBySlug.set(slug, { displayName: slug.replaceAll("-", " "), slug });
  }

  return Array.from(tagViewsBySlug.values());
}
