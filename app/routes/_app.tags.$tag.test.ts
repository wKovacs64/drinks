import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import { loader } from "./_app.tags.$tag";

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
      drinks: { slug: string }[];
    };

    expect(payload.drinks.map((drink) => drink.slug)).toEqual(["test-margarita", "test-mojito"]);
    expect(headers.get("Surrogate-Key")).toBe("all tags citrus");
    expect(headers.get("Cache-Control")).toContain("public");
    expect(headers.get("Cache-Control")).toContain("s-maxage=31557600");
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
