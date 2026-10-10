import "#/test/setup.ts";
import { test, type TestContext } from "remix/test";
import { expect } from "remix/assert";
import { createTestServer } from "remix/node-fetch-server/test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { http } from "msw/http";
import { passthrough } from "msw/utils/passthrough";
import { router } from "#/app/router.ts";
import { resetAndSeedDatabase, TEST_ADMIN_USER } from "#/test/database.ts";
import { createDrinksService, purgeSearchCache } from "#/app/modules/drinks/drinks.ts";
import { cardResultSchema, searchResultSchema } from "#/app/integrations/mcp/public/recipe.ts";
import { server as requestMocks } from "#/test/server.ts";
import { getDb } from "#/app/db/client.ts";
import { drinks } from "#/app/db/schema.ts";
import { getRawSessionCookieValue, sessionCookie } from "#/app/modules/identity/identity.ts";

async function connect(testContext: TestContext, { admin = false } = {}) {
  await resetAndSeedDatabase();
  purgeSearchCache();
  const server = await createTestServer(router.fetch);
  testContext.after(() => server.close());
  requestMocks.use(http.all(`${server.baseUrl}/*`, () => passthrough()));
  const client = new Client({ name: "drinks-test", version: "1.0.0" });
  testContext.after(() => client.close());
  const cookie = admin
    ? `${sessionCookie.name}=${await getRawSessionCookieValue({ ...TEST_ADMIN_USER, name: "Test Admin", avatarUrl: null, role: "admin" })}`
    : undefined;
  await client.connect(
    new StreamableHTTPClientTransport(new URL("/mcp", server.baseUrl), {
      requestInit: { headers: cookie ? { Cookie: cookie } : {} },
    }),
  );
  return { client, baseUrl: server.baseUrl, cookie };
}

test("public MCP clients discover read-only Drink tools and retrieve the associated card resource", async (testContext) => {
  const { client, baseUrl } = await connect(testContext);
  expect(client.getServerVersion()?.name).toBe("drinks.fyi");
  const { tools } = await client.listTools();
  expect(tools.filter((tool) => tool["_meta"]?.ui).length).toBe(1);
  expect(tools.map((tool) => tool.name).toSorted()).toEqual(["search_drinks", "show_drinks"]);
  for (const tool of tools) {
    expect(tool.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  }
  const display = tools.find((tool) => tool.name === "show_drinks");
  const ui = display?.["_meta"]?.ui;
  if (!ui || typeof ui !== "object" || !("resourceUri" in ui) || typeof ui.resourceUri !== "string")
    throw new Error("Expected show_drinks to advertise a card resource");
  const resourceUri = ui.resourceUri;
  expect(tools.find((tool) => tool.name === "search_drinks")?.["_meta"]?.ui).toBeUndefined();
  expect(resourceUri).toMatch(/^ui:\/\//);
  const { resources } = await client.listResources();
  expect(resources).toMatchObject([{ uri: resourceUri, mimeType: "text/html;profile=mcp-app" }]);
  const { contents } = await client.readResource({ uri: resourceUri });
  const [card] = contents;
  expect(card.mimeType).toBe("text/html;profile=mcp-app");
  expect(card["_meta"]).toMatchObject({
    ui: {
      csp: {
        connectDomains: [],
        resourceDomains: [baseUrl, "https://ik.imagekit.io"],
      },
    },
  });
  if (!("text" in card)) throw new Error("Expected an HTML card");
  expect(card.text.trim().length).toBeGreaterThan(0);
});

test("recipe details reach the widget while model-visible results contain only Drink slugs", async (testContext) => {
  const { client, baseUrl } = await connect(testContext);
  await getDb().update(drinks, "test-drink-1", {
    notes: "Shake with ice.\n\nStrain into a glass. Garnish with **lime**.",
  });
  for (const query of ["Test Margarita", "tequila"]) {
    const result = await client.callTool({ name: "search_drinks", arguments: { query } });
    expect(result.structuredContent).toEqual({ drinks: [{ slug: "test-margarita" }] });
    expect(JSON.stringify(result.content)).not.toContain("2 oz tequila");
    expect(result["_meta"]?.drinks).toBeUndefined();
  }
  const result = await client.callTool({
    name: "show_drinks",
    arguments: { slugs: ["test-margarita"], view: "recipe" },
  });
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toEqual({ drinks: [{ slug: "test-margarita" }] });
  for (const detail of ["2 oz tequila", "Shake with ice.", `${baseUrl}/test-margarita`])
    expect(JSON.stringify(result.content)).not.toContain(detail);
  expect(result["_meta"]).toEqual({
    drinks: [
      {
        title: "Test Margarita",
        slug: "test-margarita",
        ingredients: ["2 oz tequila", "1 oz lime juice", "1 oz triple sec"],
        notes:
          "<p>Shake with ice.</p>\n<p>Strain into a glass. Garnish with <strong>lime</strong>.</p>\n",
        calories: 200,
        imageUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        sourceUrl: `${baseUrl}/test-margarita`,
      },
    ],
  });
});

test("displaying multiple summaries preserves selected order and omits preparation notes", async (testContext) => {
  const { client } = await connect(testContext);
  const slugs = ["test-mojito", "test-margarita"];
  const result = await client.callTool({
    name: "show_drinks",
    arguments: { slugs, view: "summary" },
  });
  expect(result.structuredContent).toEqual({ drinks: slugs.map((slug) => ({ slug })) });
  const summaries = cardResultSchema.parse(result["_meta"]).drinks;
  expect(summaries.map((drink) => drink.slug)).toEqual(slugs);
  expect(summaries.map((drink) => drink.notes)).toEqual([undefined, undefined]);
  const unavailable = await client.callTool({
    name: "show_drinks",
    arguments: { slugs: [...slugs, "missing-drink"], view: "summary" },
  });
  expect(unavailable.isError).toBe(true);
  expect(unavailable["_meta"]?.drinks).toBeUndefined();
});

test("MCP exact titles return only that Drink while partial, ingredient and website searches stay broad", async (testContext) => {
  const { client } = await connect(testContext);
  const db = getDb();
  await db.update(drinks, "test-drink-3", { title: "Old Fashioned" });
  await db.update(drinks, "test-drink-2", {
    notes: "Serve in an old fashioned glass.",
    ingredients: JSON.stringify(["2 oz bourbon", "mint", "sugar"]),
  });
  const search = async (query: string) => {
    const result = await client.callTool({ name: "search_drinks", arguments: { query } });
    return searchResultSchema.parse(result.structuredContent).drinks.map((drink) => drink.slug);
  };
  for (const query of ["Old Fashioned", "  OLD FASHIONED  "])
    expect(await search(query)).toEqual(["test-old-fashioned"]);
  for (const query of ["fashioned", "bourbon"])
    expect((await search(query)).toSorted()).toEqual(["test-mojito", "test-old-fashioned"]);
  const websiteResults = await createDrinksService({ db }).searchPublishedDrinks({
    query: "old fashioned",
  });
  expect(websiteResults.map((drink) => drink.slug).toSorted()).toEqual([
    "test-mojito",
    "test-old-fashioned",
  ]);
});

test("unmatched searches return an empty result", async (testContext) => {
  const { client } = await connect(testContext);
  const search = await client.callTool({
    name: "search_drinks",
    arguments: { query: "xyznonexistent" },
  });
  expect(search.structuredContent).toEqual({ drinks: [] });
  expect(search["_meta"]?.drinks).toBeUndefined();
  expect(search.isError).not.toBe(true);
});

test("invalid MCP inputs are errors", async (testContext) => {
  const { client } = await connect(testContext);
  for (const call of [
    { name: "search_drinks", arguments: {} },
    { name: "search_drinks", arguments: { query: "  " } },
    { name: "search_drinks", arguments: { query: 42 } },
    { name: "show_drinks", arguments: {} },
    { name: "show_drinks", arguments: { slugs: ["../admin"], view: "recipe" } },
    { name: "show_drinks", arguments: { slugs: [], view: "summary" } },
    { name: "show_drinks", arguments: { slugs: ["test-margarita"], view: "unknown" } },
    {
      name: "show_drinks",
      arguments: { slugs: ["test-margarita", "test-margarita"], view: "summary" },
    },
    {
      name: "show_drinks",
      arguments: { slugs: ["test-margarita"], view: "recipe", viewerRole: "admin" },
    },
  ]) {
    const result = await client.callTool(call);
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  }
});

for (const admin of [false, true]) {
  test(`Unpublished drinks remain indistinguishable from missing Drinks${admin ? " with an Admin website session" : ""}`, async (testContext) => {
    const { client } = await connect(testContext, { admin });
    await getDb().update(drinks, "test-drink-1", { status: "unpublished" });
    const search = await client.callTool({
      name: "search_drinks",
      arguments: { query: "tequila" },
    });
    expect(search.structuredContent).toEqual({ drinks: [] });
    expect(search["_meta"]?.drinks).toBeUndefined();
    const unpublished = await client.callTool({
      name: "show_drinks",
      arguments: { slugs: ["test-margarita"], view: "recipe" },
    });
    const missing = await client.callTool({
      name: "show_drinks",
      arguments: { slugs: ["missing-drink"], view: "recipe" },
    });
    expect(unpublished.isError).toBe(true);
    expect(unpublished).toEqual(missing);
    expect(missing.content).toEqual([{ type: "text", text: "Drink not found." }]);
    expect(missing.structuredContent).toBeUndefined();
  });
}

test("unpublishing through the editorial flow removes a Drink from MCP search and retrieval", async (testContext) => {
  const { client, baseUrl, cookie } = await connect(testContext, { admin: true });
  if (!cookie) throw new Error("Expected an Admin session");
  expect(
    (await client.callTool({ name: "search_drinks", arguments: { query: "tequila" } }))
      .structuredContent,
  ).toMatchObject({ drinks: [{ slug: "test-margarita" }] });
  const form = new FormData();
  for (const [name, value] of Object.entries({
    title: "Test Margarita",
    slug: "test-margarita",
    ingredients: "2 oz tequila\n1 oz lime juice\n1 oz triple sec",
    calories: "200",
    tags: "tequila, citrus",
    notes: "A classic test margarita",
    rank: "10",
    status: "unpublished",
  }))
    form.set(name, value);
  const response = await fetch(`${baseUrl}/admin/drinks/test-margarita/edit`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
    redirect: "manual",
  });
  expect(response.status).toBe(303);
  expect(
    (await client.callTool({ name: "search_drinks", arguments: { query: "tequila" } }))
      .structuredContent,
  ).toEqual({ drinks: [] });
  expect(
    (
      await client.callTool({
        name: "show_drinks",
        arguments: { slugs: ["test-margarita"], view: "recipe" },
      })
    ).isError,
  ).toBe(true);
});

test("MCP protocol responses are not cached and do not create website sessions", async (testContext) => {
  const { baseUrl } = await connect(testContext);
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.has("Location")).toBe(false);
  expect(response.headers.has("Set-Cookie")).toBe(false);
});
