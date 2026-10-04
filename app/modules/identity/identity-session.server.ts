import { createCookie } from "remix/cookie";
import { createCookieSessionStorage } from "remix/session-storage/cookie";
import { session } from "remix/middleware/session";
import { getEnvVars } from "#/app/core/env.server.ts";
import type { SessionUser } from "./identity.ts";
export const sessionCookie = { name: "__session" } as const;
export function getIdentitySessionMiddleware() {
  const { SESSION_SECRET, NODE_ENV } = getEnvVars();
  return session(
    createCookie(sessionCookie.name, {
      secrets: [SESSION_SECRET],
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: NODE_ENV === "production",
    }),
    createCookieSessionStorage(),
  );
}
// Test helper follows the middleware's signed envelope. Never grants identities in routes.
export async function getRawSessionCookieValue(user: SessionUser): Promise<string> {
  const { createRouter } = await import("remix/router");
  const router = createRouter({ middleware: [getIdentitySessionMiddleware()] });
  router.get("/", (context) => {
    context.session.set("userId", user.id);
    return new Response();
  });
  const response = await router.fetch(new Request("http://localhost/"));
  return response.headers.get("set-cookie")?.split(";")[0].split("=").slice(1).join("=") ?? "";
}
