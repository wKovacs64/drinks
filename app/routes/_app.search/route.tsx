import { data, useSearchParams, useNavigation } from "react-router";
import { cacheHeader } from "pretty-cache-header";
import { defaultPageDescription, defaultPageTitle } from "#/app/core/config";
import { getEnvVars } from "#/app/utils/env.server";
import { withPlaceholderImages, DrinkList } from "#/app/modules/drinks";
import type { AppRouteHandle } from "#/app/types";
import {
  searchDrinks,
  SearchForm,
  NoDrinksFound,
  NoSearchTerm,
  Searching,
} from "#/app/modules/search";
import type { Route } from "./+types/route";

const { SITE_IMAGE_URL, SITE_IMAGE_ALT } = getEnvVars();

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export async function loader({ request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams.get("q");
  if (!q) {
    return data(
      { drinks: [], socialImageUrl: SITE_IMAGE_URL, socialImageAlt: SITE_IMAGE_ALT },
      {
        headers: {
          "Surrogate-Key": "all",
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

  const searchResultsCacheHeaders = {
    "Surrogate-Key": "search all",
    "Cache-Control": cacheHeader({
      public: true,
      maxAge: "30sec",
      sMaxage: "1yr",
      staleWhileRevalidate: "10min",
      staleIfError: "1day",
    }),
  };

  const drinks = await searchDrinks(q);

  if (drinks.length === 0) {
    return data(
      { drinks: [], socialImageUrl: SITE_IMAGE_URL, socialImageAlt: SITE_IMAGE_ALT },
      { headers: searchResultsCacheHeaders },
    );
  }

  const drinksWithPlaceholderImages = await withPlaceholderImages(drinks);

  return data(
    {
      drinks: drinksWithPlaceholderImages,
      socialImageUrl: SITE_IMAGE_URL,
      socialImageAlt: SITE_IMAGE_ALT,
    },
    { headers: searchResultsCacheHeaders },
  );
}

export const handle: AppRouteHandle = {
  breadcrumb: () => ({ title: "Search" }),
};

export function meta({ loaderData }: Route.MetaArgs) {
  const { socialImageUrl, socialImageAlt } = loaderData ?? {};

  return [
    { title: "Search Drinks" },
    {
      name: "description",
      content: "Search all drinks by ingredient or description",
    },
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

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { drinks } = loaderData;
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q");
  const navigation = useNavigation();
  const futureQ = new URLSearchParams(navigation.location?.search).get("q");
  const isIdle = navigation.state === "idle";
  const isLoading = navigation.state === "loading";

  const hasNoSearchTerm = isLoading ? !futureQ : !q;
  const isSearching = isLoading && navigation.location?.pathname === "/search" && futureQ;
  const hasNoResults = isIdle && q && drinks.length === 0;
  const hasResults = isIdle && drinks.length > 0;

  return (
    <>
      <SearchForm initialSearchTerm={q ?? ""} />
      {hasNoSearchTerm ? <NoSearchTerm /> : null}
      {isSearching ? <Searching /> : null}
      {hasNoResults ? <NoDrinksFound /> : null}
      {hasResults ? <DrinkList drinks={drinks} /> : null}
    </>
  );
}
