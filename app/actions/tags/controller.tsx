import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.ts";
import { publicHeaders, notFoundHeaders } from "#/app/web/gallery-cache.ts";
import { TagsPage } from "./index-page.tsx";
import { TagPage } from "./show-page.tsx";
import { NotFoundPage } from "../not-found-page.tsx";
export default createController(routes.tags, {
  actions: {
    async index(context) {
      const drinksService = createDrinksService({ db: getDb() });
      const tags = await drinksService.getAllTags();
      return context.render(<TagsPage tags={tags} />, {
        headers: {
          ...publicHeaders,
          "Surrogate-Key": `all tags ${tags.map((tag) => tag.slug).join(" ")}`,
        },
      });
    },
    async show(context) {
      const drinksService = createDrinksService({ db: getDb() });
      const taggedDrinks = await drinksService.getDrinksByTagSlug({ tagSlug: context.params.tag });
      if (!taggedDrinks)
        return context.render(<NotFoundPage />, { status: 404, headers: notFoundHeaders });
      return context.render(<TagPage taggedDrinks={taggedDrinks} />, {
        headers: { ...publicHeaders, "Surrogate-Key": `all tags ${taggedDrinks.tag.slug}` },
      });
    },
  },
});
