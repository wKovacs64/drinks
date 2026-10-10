import { test } from "remix/test";
import { expect } from "remix/assert";
import { createBrowserPage } from "#/test/e2e.ts";
import { getDb } from "#/app/db/client.ts";
import { drinks } from "#/app/db/schema.ts";
import { cardHtml } from "#/app/integrations/mcp/card-resource.ts";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

// Exercise the built card through the MCP Apps messages a host sends and receives.
test("the card displays private recipe notes and opens summary and note links through the host", async (testContext) => {
  const page = await createBrowserPage(testContext);
  await getDb().update(drinks, "test-drink-1", {
    notes:
      "## Instructions\n\nShake with ice.\n\n## Variations\n\n- Garnish with **lime**.\n- Read [another Drink](/test-mojito).",
  });
  await page.goto("/");
  const client = new Client({ name: "card-test", version: "1.0.0" });
  testContext.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", page.url())));
  const result = await client.callTool({
    name: "show_drinks",
    arguments: { slugs: ["test-margarita"], view: "recipe" },
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.setContent('<iframe title="Drink card" style="width:100%;border:0"></iframe>');
  await page.evaluate(
    ({ html, toolResult }) => {
      const iframe = document.querySelector("iframe");
      if (!iframe) throw new Error("Missing card frame");
      window.addEventListener("message", (event) => {
        if (event.source !== iframe.contentWindow) return;
        const message = event.data;
        if (message.method === "ui/initialize") {
          iframe.contentWindow?.postMessage(
            {
              jsonrpc: "2.0",
              id: message.id,
              result: {
                protocolVersion: "2026-01-26",
                hostInfo: { name: "test-host", version: "1.0.0" },
                hostCapabilities: { openLinks: {} },
                hostContext: {},
              },
            },
            "*",
          );
        } else if (message.method === "ui/notifications/initialized") {
          iframe.contentWindow?.postMessage(
            { jsonrpc: "2.0", method: "ui/notifications/tool-result", params: toolResult },
            "*",
          );
        } else if (message.method === "ui/open-link") {
          document.body.dataset.openedLink = message.params.url;
          iframe.contentWindow?.postMessage({ jsonrpc: "2.0", id: message.id, result: {} }, "*");
        } else if (message.method === "ui/notifications/size-changed") {
          iframe.style.height = `${message.params.height}px`;
        }
      });
      iframe.srcdoc = html;
    },
    { html: cardHtml, toolResult: result },
  );
  const card = page.frameLocator('iframe[title="Drink card"]');
  await card.getByText("Shake with ice.", { exact: true }).waitFor();
  expect(await card.getByRole("heading", { name: "Variations", exact: true }).count()).toBe(1);
  expect(await card.getByText("Garnish with lime.", { exact: true }).count()).toBe(1);
  expect(
    await card.getByRole("img", { name: "Test Margarita", exact: true }).getAttribute("src"),
  ).toMatch(/^data:image\/png;/);
  expect(await card.locator("a a").count()).toBe(0);
  const noteLink = card.getByRole("link", { name: "another Drink", exact: true });
  await noteLink.click();
  await page.waitForFunction(() => document.body.dataset.openedLink?.endsWith("/test-mojito"));
  await card
    .getByRole("link", { name: "Test Margarita on drinks.fyi", exact: true })
    .press("Enter");
  await page.waitForFunction(() => document.body.dataset.openedLink?.endsWith("/test-margarita"));
});
