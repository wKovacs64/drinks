import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { loader } from "./_app.search";

beforeEach(async () => {
  await resetAndSeedDatabase();
});

describe("search route", () => {
  test("returns published search results with public cache headers", async () => {
    const response = await loader({
      request: new Request("https://example.com/search?q=tequila"),
    } as never);

    const headers = getHeaders(response);
    const payload = getPayload(response) as {
      drinks: { slug: string }[];
    };

    expect(payload.drinks.map((drink) => drink.slug)).toEqual(["test-margarita"]);
    expect(headers.get("Surrogate-Key")).toBe("search all");
    expect(headers.get("Cache-Control")).toContain("public");
    expect(headers.get("Cache-Control")).toContain("s-maxage=31557600");
  });

  test("returns an empty result set when q is missing", async () => {
    const response = await loader({
      request: new Request("https://example.com/search"),
    } as never);

    const headers = getHeaders(response);
    const payload = getPayload(response) as {
      drinks: { slug: string }[];
    };

    expect(payload.drinks).toEqual([]);
    expect(headers.get("Surrogate-Key")).toBe("all");
    expect(headers.get("Cache-Control")).toContain("public");
  });
});

function getHeaders(response: unknown) {
  if (response instanceof Response) {
    return response.headers;
  }

  const init = (response as { init?: ResponseInit }).init;
  return new Headers(init?.headers);
}

function getPayload(response: unknown) {
  if (response instanceof Response) {
    throw new Error("Expected react-router data payload, got Response");
  }

  return (response as { data: unknown }).data;
}
