import "#/test/setup.ts";
import { test, type TestContext } from "remix/test";
import { expect } from "remix/assert";
import { createTestServer } from "remix/node-fetch-server/test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { http } from "msw/http";
import { passthrough } from "msw/utils/passthrough";
import { router } from "#/app/router.ts";
import { resetAndSeedDatabase, TEST_ADMIN_USER } from "#/test/database.ts";
import { purgeSearchCache } from "#/app/modules/drinks/drinks.ts";
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
  expect(tools.map((tool) => tool.name).toSorted()).toEqual(["get_drink", "search_drinks"]);
  for (const tool of tools) {
    expect(tool.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
  }
  const getDrink = tools.find((tool) => tool.name === "get_drink");
  const ui = getDrink?.["_meta"]?.ui;
  if (!ui || typeof ui !== "object" || !("resourceUri" in ui) || typeof ui.resourceUri !== "string")
    throw new Error("Expected get_drink to advertise a card resource");
  const resourceUri = ui.resourceUri;
  expect(tools.find((tool) => tool.name === "search_drinks")?.["_meta"]?.ui).toMatchObject({
    resourceUri,
  });
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

test("clients search by name and ingredient, then retrieve exact quantities and full instructions", async (testContext) => {
  const { client, baseUrl } = await connect(testContext);
  await getDb().update(drinks, "test-drink-1", {
    notes: "Shake with ice.\n\nStrain into a glass. Garnish with **lime**.",
  });
  for (const query of ["Test Margarita", "tequila"]) {
    const result = await client.callTool({ name: "search_drinks", arguments: { query } });
    expect(result.structuredContent).toMatchObject({
      drinks: [{ title: "Test Margarita", slug: "test-margarita" }],
    });
  }
  const result = await client.callTool({
    name: "get_drink",
    arguments: { slug: "test-margarita" },
  });
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toEqual({
    drink: {
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
  });
  expect(result.content).toEqual([
    { type: "text", text: JSON.stringify(result.structuredContent) },
  ]);
});

test("unmatched searches return an empty result", async (testContext) => {
  const { client } = await connect(testContext);
  const search = await client.callTool({
    name: "search_drinks",
    arguments: { query: "xyznonexistent" },
  });
  expect(search.structuredContent).toEqual({ drinks: [] });
  expect(search.isError).not.toBe(true);
});

test("invalid MCP inputs are errors", async (testContext) => {
  const { client } = await connect(testContext);
  for (const call of [
    { name: "search_drinks", arguments: {} },
    { name: "search_drinks", arguments: { query: "  " } },
    { name: "search_drinks", arguments: { query: 42 } },
    { name: "get_drink", arguments: {} },
    { name: "get_drink", arguments: { slug: "../admin" } },
    { name: "get_drink", arguments: { slug: "test-margarita", viewerRole: "admin" } },
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
    const unpublished = await client.callTool({
      name: "get_drink",
      arguments: { slug: "test-margarita" },
    });
    const missing = await client.callTool({
      name: "get_drink",
      arguments: { slug: "missing-drink" },
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
    (await client.callTool({ name: "get_drink", arguments: { slug: "test-margarita" } })).isError,
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
