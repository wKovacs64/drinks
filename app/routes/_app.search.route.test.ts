import { RouterContextProvider } from "react-router";
import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { loader } from "./_app.search";
import type { Route } from "./+types/_app.search";

beforeEach(async () => {
  await resetAndSeedDatabase();
});

describe("search route", () => {
  test("returns published search results with public cache headers", async () => {
    const response = await loader(createLoaderArgs("https://example.com/search?q=tequila"));

    const headers = getHeaders(response);
    const payload = getPayload(response);

    expect(payload.drinks.map((drink) => drink.slug)).toEqual(["test-margarita"]);
    expect(headers.get("Surrogate-Key")).toBe("search all");
    expect(headers.get("Cache-Control")).toContain("public");
    expect(headers.get("Cache-Control")).toContain("s-maxage=31557600");
  });

  test("returns an empty result set when q is missing", async () => {
    const response = await loader(createLoaderArgs("https://example.com/search"));

    const headers = getHeaders(response);
    const payload = getPayload(response);

    expect(payload.drinks).toEqual([]);
    expect(headers.get("Surrogate-Key")).toBe("all");
    expect(headers.get("Cache-Control")).toContain("public");
  });
});

function createLoaderArgs(url: string): Route.LoaderArgs {
  const request = new Request(url);
  return {
    request,
    url: new URL(url),
    params: {},
    pattern: "/search",
    context: new RouterContextProvider(),
  };
}

function getHeaders(response: Response | { init?: ResponseInit | null }) {
  if (response instanceof Response) {
    return response.headers;
  }

  return new Headers(response.init?.headers);
}

function getPayload<T>(response: Response | { data: T }) {
  if (response instanceof Response) {
    throw new Error("Expected react-router data payload, got Response");
  }

  return response.data;
}
