import "#/test/setup.ts";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "remix/test";
import { expect } from "remix/assert";

test("rejects unhandled requests before they reach the network", async (testContext) => {
  const logError = testContext.mock.method(console, "error", () => {});
  let networkRequests = 0;
  const server = createServer((_request, response) => {
    networkRequests++;
    response.end("Unexpected network request");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");
    const { port } = address;
    const requestUrl = `http://127.0.0.1:${port}/unhandled`;
    await expect(fetch(requestUrl)).rejects.toThrow("fetch failed");
    expect(networkRequests).toBe(0);
    expect(logError).toHaveBeenCalled();
    for (const call of logError.mock.calls) {
      expect(call.arguments[0]).toContain(
        "intercepted a request without a matching request handler",
      );
      expect(call.arguments[0]).toContain(`GET ${requestUrl}`);
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
