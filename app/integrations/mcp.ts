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
        "Drink cards are the complete response. For preparation requests, call get_drink with the selected slug to display existing instructions and variations inside the card. Recipe details are delivered privately to the card, not to you. End the response after displaying cards. Do not add text, images, recipe previews, other sources or follow-up questions. Do not invent missing recipe details.",
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
            "Displays drinks.fyi recipes with their own photos, ingredient quantities, calories and recipe links. get_drink also displays all stored preparation instructions and variations. Recipe data is private to this widget. The cards are the complete answer, including preparation requests. Do not add text, images, recipe previews or follow-up questions.",
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
        "Search Published drinks.fyi recipes by name or ingredient and display matching Drink cards. An exact title match, ignoring case and surrounding whitespace, returns only that Drink; other queries return all matching Drinks. The cards are the answer; end the response after displaying them, without text, additional images or recipe previews. Use a result's slug with get_drink only when preparation instructions are requested.",
      inputSchema: z.strictObject({ query: z.string().trim().min(1) }),
      outputSchema: searchResultSchema,
      annotations,
      _meta: { ui: { resourceUri: cardUri } },
    },
    async ({ query }) => {
      const results = (await drinks.searchPublishedDrinks({ query, preferExactTitle: true })).map(
        toSummary,
      );
      const structuredContent = { drinks: results.map(({ slug }) => ({ slug })) };
      return {
        content: [
          {
            type: "text",
            text: results.length
              ? "Matching Drink cards are displayed with photos, ingredients, calories and recipe links. End the response here. Do not repeat the cards in text or add another image or recipe preview."
              : "No matching drinks.fyi recipes found.",
          },
        ],
        structuredContent,
        _meta: { drinks: results },
      };
    },
  );
  registerAppTool(
    server,
    "get_drink",
    {
      description:
        "Display a Published drinks.fyi recipe by its search result slug, including all stored preparation instructions and variations inside the Drink card. Use this tool for preparation requests. Recipe details are private to the card. End the response after the card without text, images, recipe previews or follow-up questions.",
      inputSchema: z.strictObject({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }),
      outputSchema: drinkResultSchema,
      annotations,
      _meta: { ui: { resourceUri: cardUri } },
    },
    async ({ slug }) => {
      const result = await drinks.getDrinkBySlug({ slug, viewerRole: "user" });
      if (!result) return { isError: true, content: [{ type: "text", text: "Drink not found." }] };
      const structuredContent = { drink: { slug: result.drink.slug } };
      return {
        content: [
          {
            type: "text",
            text: "The full recipe is displayed in the Drink card, including all stored instructions and variations. End the response here. Do not add text, images or another recipe preview.",
          },
        ],
        structuredContent,
        _meta: { drinks: [{ ...toSummary(result.drink), notes: result.drink.notes }] },
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
