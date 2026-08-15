import { RouterContextProvider } from "react-router";
import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { loader, meta } from "./_app.tags.$tag";
import type { Route } from "./+types/_app.tags.$tag";

beforeEach(async () => {
  await resetAndSeedDatabase();
});

describe("tag route", () => {
  test("returns tagged drinks with long-lived public cache headers", async () => {
    const response = await loader(createLoaderArgs());

    const headers = getHeaders(response);
    const payload = getPayload(response);

    expect(payload.tag).toEqual({ displayName: "citrus", slug: "citrus" });
    expect(payload.drinks.map((drink) => drink.slug)).toEqual(["test-margarita", "test-mojito"]);
    expect(headers.get("Surrogate-Key")).toBe("all tags citrus");
    expect(headers.get("Cache-Control")).toContain("public");
    expect(headers.get("Cache-Control")).toContain("s-maxage=31557600");
  });

  test("uses the resolved tag display name for metadata", async () => {
    const response = await loader(createLoaderArgs());
    const loaderData = getPayload(response);

    const tags = meta({ loaderData, params: { tag: "citrus" } });

    expect(tags).toContainEqual({ title: "Drinks with citrus" });
    expect(tags).toContainEqual({ name: "description", content: "All drinks containing citrus" });
  });
});

function createLoaderArgs(): Route.LoaderArgs {
  const url = new URL("https://example.com/tags/citrus");
  return {
    request: new Request(url),
    url,
    params: { tag: "citrus" },
    pattern: "/tags/:tag",
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
