import {
  createMcpHandler,
  McpServer,
  hostHeaderValidationResponse,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Middleware } from "remix/router";
import { getDb } from "#/app/db/client.ts";
import { createDrinksService, type DrinkView } from "#/app/modules/drinks/drinks.ts";
import { routes } from "#/app/routes.ts";
import { drinkResultSchema, recipeSchema } from "#/app/integrations/mcp/public/recipe.ts";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { cardHtml, cardUri } from "#/app/integrations/mcp/card-resource.ts";

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const mcpHandler = createMcpHandler(({ requestInfo }) => {
  if (!requestInfo) throw new Error("MCP requires an HTTP request");
  const origin = new URL(requestInfo.url).origin;
  const toSummary = (drink: DrinkView) => ({
    title: drink.title,
    slug: drink.slug,
    ingredients: drink.ingredients,
    calories: drink.calories,
    imageUrl: new URL(drink.image.url, origin).href,
    sourceUrl: new URL(routes.drinks.show.href({ slug: drink.slug }), origin).href,
  });
  const server = new McpServer({ name: "drinks.fyi", version: "1.0.0" });
  const drinks = createDrinksService({ db: getDb() });
  registerAppResource(server, "Drink card", cardUri, {}, async () => ({
    contents: [
      {
        uri: cardUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: cardHtml,
        _meta: {
          ui: {
            prefersBorder: false,
            csp: {
              connectDomains: [],
              resourceDomains: [origin, "https://ik.imagekit.io"],
            },
          },
        },
      },
    ],
  }));
  server.registerTool(
    "search_drinks",
    {
      description:
        "Search Published drinks.fyi recipes by name or ingredient. Use a result's slug with get_drink for its complete recipe.",
      inputSchema: z.strictObject({ query: z.string().trim().min(1) }),
      outputSchema: z.object({ drinks: z.array(recipeSchema.omit({ notes: true })) }),
      annotations,
    },
    async ({ query }) => {
      const results = (await drinks.searchPublishedDrinks({ query })).map(toSummary);
      const structuredContent = { drinks: results };
      return {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
      };
    },
  );
  registerAppTool(
    server,
    "get_drink",
    {
      description:
        "Retrieve a Published drinks.fyi recipe by its search result slug, including ingredient quantities and full recipe notes/instructions.",
      inputSchema: z.strictObject({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }),
      outputSchema: drinkResultSchema,
      annotations,
      _meta: { ui: { resourceUri: cardUri } },
    },
    async ({ slug }) => {
      const result = await drinks.getDrinkBySlug({ slug, viewerRole: "user" });
      if (!result) return { isError: true, content: [{ type: "text", text: "Drink not found." }] };
      const structuredContent = {
        drink: { ...toSummary(result.drink), notes: result.drink.notes },
      };
      return {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
        structuredContent,
      };
    },
  );
  return server;
});

// MCP owns its protocol responses; website sessions and document middleware never run here.
export const mcp: Middleware = async (context, next) => {
  if (context.url.pathname !== "/mcp") return next();
  const request = context.request;
  const rejected =
    hostHeaderValidationResponse(request, [
      "drinks.fyi",
      "drinks.fly.dev",
      "drinks-dev.fly.dev",
      "localhost",
      "127.0.0.1",
      "[::1]",
    ]) ?? originValidationResponse(request, [context.url.hostname]);
  const response = rejected ?? (await mcpHandler.fetch(request));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
};
