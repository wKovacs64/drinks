import { createCookie } from "remix/cookie";
import { createCookieSessionStorage } from "remix/session-storage/cookie";
import { session } from "remix/middleware/session";
import { env } from "#/app/core/env.ts";

export const sessionCookie = { name: "__session" } as const;

export function getIdentitySessionMiddleware() {
  return session(
    createCookie(sessionCookie.name, {
      secrets: [env.SESSION_SECRET],
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    }),
    createCookieSessionStorage(),
  );
}
