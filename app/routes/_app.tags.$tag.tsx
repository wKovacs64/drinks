import { data } from "react-router";
import { lowerCase, startCase } from "lodash-es";
import { cacheHeader } from "pretty-cache-header";
import { invariantResponse } from "@epic-web/invariant";
import { defaultPageDescription, defaultPageTitle } from "#/app/core/config";
import { getLoaderDataForHandle, getSurrogateKeyForTag } from "#/app/core/utils";
import { getEnvVars } from "#/app/core/env.server";
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
  const drinks = await drinksService.getDrinksByTag(params.tag);

  invariantResponse(drinks, "No drinks found", {
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
      drinks,
      socialImageUrl: SITE_IMAGE_URL,
      socialImageAlt: SITE_IMAGE_ALT,
    },
    {
      headers: {
        "Surrogate-Key": `all tags ${getSurrogateKeyForTag(params.tag)}`,
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
          <span>{lowerCase(matches.at(-1)?.params.tag)}</span>
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
  const { tag } = params;

  return [
    { title: `Drinks with ${startCase(tag)}` },
    { name: "description", content: `All drinks containing ${lowerCase(tag)}` },
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
