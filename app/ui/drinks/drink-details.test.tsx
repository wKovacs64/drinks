import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";
import type { DrinkView } from "#/app/modules/drinks/drinks";
import { DrinkDetails } from "./drink-details";

describe("DrinkDetails", () => {
  test("renders tag display names and links with tag slugs from the drink view", () => {
    const drink: DrinkView = {
      title: "Tagged Drink",
      slug: "tagged-drink",
      image: { url: "https://example.com/drink.jpg", blurDataUrl: "data:image/gif;base64,test" },
      ingredients: ["gin"],
      calories: 100,
      notes: null,
      tags: [{ displayName: "bright citrus", slug: "citrus" }],
    };

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <DrinkDetails drink={drink} />
      </MemoryRouter>,
    );

    expect(markup).toContain("bright citrus");
    expect(markup).toContain('href="/tags/citrus"');
    expect(markup).toContain('aria-label="Find all drinks containing bright citrus"');
  });
});
