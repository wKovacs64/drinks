import { App } from "@modelcontextprotocol/ext-apps";
import { createRoot, on } from "remix/component";
import { DrinkSummary } from "#/app/ui/drinks/drink-summary.tsx";
import { drinkResultSchema } from "#/app/integrations/mcp/public/recipe.ts";

const container = document.getElementById("card");
if (!container) throw new Error("Missing Drink card container");
const root = createRoot(container);
const app = new App(
  { name: "drinks.fyi", version: "1.0.0" },
  {},
  { strict: true, autoResize: true },
);

app.ontoolresult = (result) => {
  const parsed = drinkResultSchema.safeParse(result.structuredContent);
  if (result.isError || !parsed.success) {
    root.render(null);
    return;
  }
  const { drink } = parsed.data;
  root.render(
    <a
      className="border-burnt-orange text-maroon focus-visible:outline-maroon active:border-maroon block border-4 border-double bg-gray-100 wrap-anywhere focus-visible:outline-3 focus-visible:outline-offset-2"
      href={drink.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${drink.title} on drinks.fyi`}
      mix={on("click", async (event) => {
        event.preventDefault();
        const navigation = await app.openLink({ url: drink.sourceUrl });
        if (navigation.isError) console.error("Host declined Drink link");
      })}
    >
      <DrinkSummary
        drink={{ ...drink, image: { url: drink.imageUrl, blurDataUrl: "" }, tags: [] }}
        variant="compact"
        priority
      />
    </a>,
  );
};
app.onteardown = async () => {
  root.dispose();
  return {};
};
await app.connect();
