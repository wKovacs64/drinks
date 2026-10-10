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
import { cardResultSchema, searchResultSchema } from "#/app/integrations/mcp/public/recipe.ts";
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
        "Search discovers Drink references without displaying cards. Call show_drinks once with the final selected slugs: use view recipe for preparation requests, or view summary for drink searches and selections. For broad searches, display every returned slug in result order unless the user requests a subset. Do not display a summary before a recipe for the same request. Drink cards are the complete response. Recipe details are delivered privately to the card, not to you. End the response after displaying cards. Do not add text, images, recipe previews, other sources or follow-up questions. Do not invent missing recipe details.",
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
            "Displays drinks.fyi recipes with their own photos, ingredient quantities, calories and recipe links. The recipe view also displays all stored preparation instructions and variations. Only show_drinks displays this widget; search_drinks discovers references without displaying cards. Recipe data is private to this widget. The cards are the complete answer, including preparation requests. Do not add text, images, recipe previews or follow-up questions.",
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
        "Discover Published drinks.fyi recipes by name or ingredient without displaying cards. An exact title match, ignoring case and surrounding whitespace, returns only that Drink; other queries return all matching Drinks. Then call show_drinks once with all returned slugs in result order unless the user requests a subset. Use view recipe for preparation instructions, summary otherwise. If no matches exist, report that without displaying cards.",
      inputSchema: z.strictObject({ query: z.string().trim().min(1) }),
      outputSchema: searchResultSchema,
      annotations,
    },
    async ({ query }) => {
      const results = await drinks.searchPublishedDrinks({ query, preferExactTitle: true });
      const structuredContent = { drinks: results.map(({ slug }) => ({ slug })) };
      return {
        content: [
          {
            type: "text",
            text: results.length
              ? "Matching Drink references found. No cards have been displayed. Call show_drinks once with all returned slugs in result order unless the user requests a subset, using recipe for preparation requests or summary otherwise."
              : "No matching drinks.fyi recipes found.",
          },
        ],
        structuredContent,
      };
    },
  );
  registerAppTool(
    server,
    "show_drinks",
    {
      description:
        "Display selected Published drinks.fyi recipes in one widget, preserving slug order. Use the slugs returned by search_drinks, or selected slugs from a previous result. Call once per user request: view recipe displays ingredients and all stored preparation instructions and variations; view summary displays ingredients without preparation notes. Do not display both views for the same request. Recipe details are private to the card. End the response after the widget without text, images, recipe previews or follow-up questions.",
      inputSchema: z.strictObject({
        slugs: z
          .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
          .min(1)
          .refine((slugs) => new Set(slugs).size === slugs.length, "Select each Drink once."),
        view: z.enum(["summary", "recipe"]),
      }),
      outputSchema: searchResultSchema,
      annotations,
      _meta: { ui: { resourceUri: cardUri } },
    },
    async ({ slugs, view }) => {
      const recipes: z.infer<typeof cardResultSchema>["drinks"] = [];
      for (const slug of slugs) {
        const result = await drinks.getDrinkBySlug({ slug, viewerRole: "user" });
        if (!result)
          return { isError: true, content: [{ type: "text", text: "Drink not found." }] };
        recipes.push({
          ...toSummary(result.drink),
          ...(view === "recipe" ? { notes: result.drink.notes } : {}),
        });
      }
      return {
        content: [
          {
            type: "text",
            text: "The selected Drink cards are displayed in the requested view. End the response here. Do not display another view, add text, images or another recipe preview.",
          },
        ],
        structuredContent: { drinks: recipes.map(({ slug }) => ({ slug })) },
        _meta: { drinks: recipes },
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
