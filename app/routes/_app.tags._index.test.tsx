import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test } from "vitest";
import { resetAndSeedDatabase } from "#/app/db/reset.server";
import TagsPage, { loader } from "./_app.tags._index";

beforeEach(async () => {
  await resetAndSeedDatabase();
});

describe("tags index route", () => {
  test("returns link-ready tags with long-lived public cache headers", async () => {
    const response = await loader();

    const headers = getHeaders(response);
    const payload = getPayload(response);

    expect(payload.tags).toEqual([
      { displayName: "bourbon", slug: "bourbon" },
      { displayName: "citrus", slug: "citrus" },
      { displayName: "classic", slug: "classic" },
      { displayName: "mint", slug: "mint" },
      { displayName: "rum", slug: "rum" },
      { displayName: "tequila", slug: "tequila" },
    ]);
    expect(headers.get("Surrogate-Key")).toBe("all tags bourbon citrus classic mint rum tequila");
    expect(headers.get("Cache-Control")).toContain("public");
    expect(headers.get("Cache-Control")).toContain("s-maxage=31557600");
  });

  test("renders tag display names and links with tag slugs from loader data", () => {
    const loaderData = {
      tags: [{ displayName: "bright citrus", slug: "citrus" }],
      socialImageUrl: "https://example.com/social.jpg",
      socialImageAlt: "social image",
    };

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        {/* @ts-expect-error Route props include framework metadata that this component does not use. */}
        <TagsPage loaderData={loaderData} />
      </MemoryRouter>,
    );

    expect(markup).toContain("bright citrus");
    expect(markup).toContain('href="/tags/citrus"');
  });
});

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
