import { setupServer } from "msw/node";
import { handlers } from "#/test/msw-handlers.ts";

const server = setupServer(...handlers);
server.listen({ onUnhandledRequest: "bypass" });
