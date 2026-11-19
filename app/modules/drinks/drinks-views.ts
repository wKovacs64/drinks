import type { DrinkSummaryView, DrinkView } from "./drinks-contract.ts";
import { generateBlurDataUrl } from "./drinks-images.ts";
import { markdownToAllowlistedHtml } from "./drinks-markdown.ts";
import type { Drink } from "./drinks-rows.ts";
import { toDrinkTagViews } from "./drinks-tags.ts";

export function toDrinkSummaryViews(drinks: Drink[]): Promise<DrinkSummaryView[]> {
  return Promise.all(drinks.map(toDrinkSummaryView));
}

export async function toDrinkView(drink: Drink): Promise<DrinkView> {
  return {
    ...(await toDrinkSummaryView(drink)),
    notesHtml: drink.notes && markdownToAllowlistedHtml(drink.notes),
    tags: toDrinkTagViews(drink.tags),
  };
}

async function toDrinkSummaryView(drink: Drink): Promise<DrinkSummaryView> {
  return {
    title: drink.title,
    slug: drink.slug,
    image: { url: drink.imageUrl, blurDataUrl: await generateBlurDataUrl(drink.imageUrl) },
    ingredients: drink.ingredients,
    calories: drink.calories,
  };
}
