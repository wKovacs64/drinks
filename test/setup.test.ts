import "#/test/setup.ts";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "remix/test";
import { expect } from "remix/assert";

test("allows ImageKit's data URL probe to use the native fetch implementation", async () => {
  const response = await fetch("data:text/plain,ImageKit%20probe");
  expect(await response.text()).toBe("ImageKit probe");
});

test("rejects unhandled requests before they reach the network", async () => {
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
    await expect(fetch(`http://127.0.0.1:${port}/unhandled`)).rejects.toThrow("fetch failed");
    expect(networkRequests).toBe(0);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
