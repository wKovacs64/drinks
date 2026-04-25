import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { loader, meta } from "./_app.tags.$tag";

beforeEach(async () => {
  await resetAndSeedDatabase();
});

describe("tag route", () => {
  test("returns tagged drinks with long-lived public cache headers", async () => {
    const response = await loader({
      params: { tag: "citrus" },
    } as never);

    const headers = getHeaders(response);
    const payload = getPayload(response) as {
      tag: { displayName: string; slug: string };
      drinks: { slug: string }[];
    };

    expect(payload.tag).toEqual({ displayName: "citrus", slug: "citrus" });
    expect(payload.drinks.map((drink) => drink.slug)).toEqual(["test-margarita", "test-mojito"]);
    expect(headers.get("Surrogate-Key")).toBe("all tags citrus");
    expect(headers.get("Cache-Control")).toContain("public");
    expect(headers.get("Cache-Control")).toContain("s-maxage=31557600");
  });

  test("uses the resolved tag display name for metadata", async () => {
    const response = await loader({
      params: { tag: "citrus" },
    } as never);
    const loaderData = getPayload(response);

    const tags = meta({ loaderData, params: { tag: "citrus" } } as never);

    expect(tags).toContainEqual({ title: "Drinks with citrus" });
    expect(tags).toContainEqual({ name: "description", content: "All drinks containing citrus" });
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
