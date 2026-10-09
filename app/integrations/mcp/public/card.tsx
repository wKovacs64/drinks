import { App } from "@modelcontextprotocol/ext-apps";
import { createRoot, on, unsafeHTML } from "remix/component";
import { DrinkSummary } from "#/app/ui/drinks/drink-summary.tsx";
import { cardResultSchema } from "#/app/integrations/mcp/public/recipe.ts";

const container = document.getElementById("card");
if (!container) throw new Error("Missing Drink card container");
const root = createRoot(container);
const app = new App(
  { name: "drinks.fyi", version: "1.0.0" },
  {},
  { strict: true, autoResize: true },
);

app.ontoolresult = (result) => {
  const parsed = cardResultSchema.safeParse(result["_meta"]);
  if (result.isError || !parsed.success) {
    root.render(null);
    return;
  }
  root.render(
    parsed.data.drinks.map((drink, index) => (
      <article
        key={drink.slug}
        className="border-burnt-orange text-maroon border-4 border-double bg-gray-100 wrap-break-word"
        mix={on("click", async (event) => {
          const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
          if (!(link instanceof HTMLAnchorElement)) return;
          const href = link.getAttribute("href");
          if (href === null) return;
          event.preventDefault();
          const navigation = await app.openLink({
            url: new URL(href, drink.sourceUrl).href,
          });
          if (navigation.isError) console.error("Host declined Drink link");
        })}
      >
        <a
          className="focus-visible:outline-maroon block focus-visible:outline-3 focus-visible:outline-offset-2 active:bg-gray-200"
          href={drink.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${drink.title} on drinks.fyi`}
        >
          <DrinkSummary
            drink={{ ...drink, image: { url: drink.imageUrl, blurDataUrl: "" } }}
            variant="compact"
            priority={index === 0}
          />
        </a>
        {drink.notes ? (
          <div
            className="border-burnt-orange [&_a]:active:text-burnt-orange border-bs border-dotted p-4 text-base leading-normal [&_a]:underline [&_a]:focus-visible:outline-3 [&_a]:focus-visible:outline-offset-2 [&_h1]:text-xl [&_h2]:text-xl [&_h3]:text-lg [&_li+li]:mbs-2 [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5 [&>*]:my-0 [&>*+*]:mbs-4"
            innerHTML={unsafeHTML(drink.notes)}
          />
        ) : null}
      </article>
    )),
  );
};
app.onteardown = async () => {
  root.dispose();
  return {};
};
await app.connect();
