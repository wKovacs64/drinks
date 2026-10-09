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
import { drinkResultSchema, searchResultSchema } from "#/app/integrations/mcp/public/recipe.ts";
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
  const server = new McpServer(
    { name: "drinks.fyi", version: "1.0.0" },
    {
      instructions:
        "Use get_drink before explaining how to make a Drink. Base drinks.fyi recipe explanations on its returned ingredients and notes, preserving quantities, steps, and optional variations. Do not invent missing details or blend in other recipes. Cite sourceUrl for the recipe. The Drink card already shows imageUrl; do not add unrelated images or sources to this recipe's presentation. If notes are missing, say drinks.fyi provides no instructions.",
    },
  );
  const drinks = createDrinksService({ db: getDb() });
  registerAppResource(server, "Drink card", cardUri, {}, async () => ({
    contents: [
      {
        uri: cardUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: cardHtml,
        _meta: {
          "openai/widgetDescription":
            "Displays drinks.fyi Drink cards using each returned photo, title, ingredient quantities, calories when available, and sourceUrl. Search results omit preparation notes; get_drink returns them.",
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
  registerAppTool(
    server,
    "search_drinks",
    {
      description:
        "Search Published drinks.fyi recipes by name or ingredient and display matching Drink cards. Use a result's slug with get_drink for its complete recipe.",
      inputSchema: z.strictObject({ query: z.string().trim().min(1) }),
      outputSchema: searchResultSchema,
      annotations,
      _meta: { ui: { resourceUri: cardUri } },
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
