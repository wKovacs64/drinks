import { data } from "react-router";
import { lowerCase } from "lodash-es";
import { cacheHeader } from "pretty-cache-header";
import { invariantResponse } from "@epic-web/invariant";
import { defaultPageDescription, defaultPageTitle } from "#/app/core/config";
import { getLoaderDataForHandle } from "#/app/core/utils";
import { getEnvVars } from "#/app/core/env.server";
import { getSurrogateKeyForTagSlug } from "#/app/integrations/fastly.server";
import { getDb } from "#/app/db/client.server";
import { createDrinksService } from "#/app/modules/drinks/drinks.server";
import { DrinkList } from "#/app/ui/drinks/drink-list";
import type { AppRouteHandle } from "#/app/types";
import type { Route } from "./+types/_app.tags.$tag";

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ params }: Route.LoaderArgs) {
  const { SITE_IMAGE_URL, SITE_IMAGE_ALT } = getEnvVars();
  const drinksService = createDrinksService({ db: getDb() });
  const taggedDrinks = await drinksService.getDrinksByTagSlug({ tagSlug: params.tag });

  invariantResponse(taggedDrinks, "No drinks found", {
    status: 404,
    headers: {
      "Surrogate-Key": "all",
      "Cache-Control": cacheHeader({
        public: true,
        maxAge: "30sec",
        sMaxage: "1min",
        mustRevalidate: true,
      }),
    },
  });

  return data(
    {
      tag: taggedDrinks.tag,
      drinks: taggedDrinks.drinks,
      socialImageUrl: SITE_IMAGE_URL,
      socialImageAlt: SITE_IMAGE_ALT,
    },
    {
      headers: {
        "Surrogate-Key": `all tags ${getSurrogateKeyForTagSlug(taggedDrinks.tag.slug)}`,
        "Cache-Control": cacheHeader({
          public: true,
          maxAge: "30sec",
          sMaxage: "1yr",
          staleWhileRevalidate: "10min",
          staleIfError: "1day",
        }),
      },
    },
  );
}

export const handle: AppRouteHandle = {
  breadcrumb: (matches) => {
    const loaderData = getLoaderDataForHandle<Route.ComponentProps["loaderData"]>(
      "routes/_app.tags.$tag",
      matches,
    );
    return {
      title: loaderData ? (
        <div className="inline-flex gap-2">
          <span>{loaderData.tag.displayName}</span>
          <span>( {loaderData.drinks.length} )</span>
        </div>
      ) : (
        "Not Found"
      ),
    };
  },
};

export function meta({ loaderData, params }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData ?? {};
  const displayName = loaderData?.tag.displayName ?? lowerCase(params.tag);

  return [
    { title: `Drinks with ${displayName}` },
    { name: "description", content: `All drinks containing ${displayName}` },
    { property: "og:title", content: defaultPageTitle },
    { property: "og:description", content: defaultPageDescription },
    { property: "og:image", content: socialImageUrl },
    { property: "og:image:alt", content: socialImageAlt },
    { name: "twitter:title", content: defaultPageTitle },
    { name: "twitter:description", content: defaultPageDescription },
    { name: "twitter:image", content: socialImageUrl },
    { name: "twitter:image:alt", content: socialImageAlt },
  ];
}

export default function TagPage({ loaderData }: Route.ComponentProps) {
  const { drinks } = loaderData;

  return <DrinkList drinks={drinks} />;
}
