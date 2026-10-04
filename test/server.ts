import { setupServer } from "msw/node";
import { handlers } from "./msw-handlers.ts";

export const server = setupServer(...handlers);
