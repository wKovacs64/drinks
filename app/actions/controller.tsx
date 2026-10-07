import { createController } from "remix/router";
import { routes } from "#/app/routes.ts";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService } from "#/app/modules/drinks/drinks.ts";
import { rawSql } from "remix/data-table";
import { assets, fetchHmrEvents } from "#/app/assets.ts";
import { getEnvVars } from "#/app/core/env.ts";
import { publicHeaders, notFoundHeaders } from "#/app/web/gallery-cache.ts";
import { HomePage } from "./home-page.tsx";
import { NotFoundPage } from "./not-found-page.tsx";
export default createController(routes, {
  actions: {
    async assets(context) {
      const hmrEvents = await fetchHmrEvents(context.request);
      if (hmrEvents) return hmrEvents;
      return (await assets.fetch(context.request)) ?? new Response("Not Found", { status: 404 });
    },
    async healthcheck() {
      await getDb().exec(rawSql("SELECT 1"));
      return new Response("ok");
    },

    robots() {
      return new Response(
        `User-agent: *\n${getEnvVars().DEPLOYMENT_ENV === "prod" ? "Allow: /" : "Disallow: /"}`,
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        },
      );
    },
    manifest() {
      return Response.json(
        {
          name: "drinks.fyi",
          short_name: "Drinks",
          lang: "en-US",
          start_url: routes.home.href(),
          display: "minimal-ui",
          background_color: "#137752",
          theme_color: "#137752",
          icons: [192, 512].flatMap((size) => [
            {
              src: `/images/icon-${size}x${size}.png`,
              sizes: `${size}x${size}`,
              type: "image/png",
            },
            {
              src: `/images/icon-maskable-${size}x${size}.png`,
              sizes: `${size}x${size}`,
              type: "image/png",
              purpose: "maskable",
            },
          ]),
        },
        {
          headers: {
            "Content-Type": "application/manifest+json",
            "Cache-Control": "no-cache, must-revalidate",
          },
        },
      );
    },
    async home(context) {
      const drinksService = createDrinksService({ db: getDb() });
      const drinks = await drinksService.getPublishedDrinks();
      return context.render(<HomePage drinks={drinks} />, {
        headers: { ...publicHeaders, "Surrogate-Key": "all index" },
      });
    },
    notFound(context) {
      return context.render(<NotFoundPage gallery />, { status: 404, headers: notFoundHeaders });
    },
  },
});
