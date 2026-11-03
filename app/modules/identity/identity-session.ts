import { createCookie } from "remix/cookie";
import { createCookieSessionStorage } from "remix/session-storage/cookie";
import { session } from "remix/middleware/session";
import { getEnvVars } from "#/app/core/env.ts";
export const sessionCookie = { name: "__session" } as const;
export function createIdentitySessionCookie() {
  const { SESSION_SECRET, NODE_ENV } = getEnvVars();
  return createCookie(sessionCookie.name, {
    secrets: [SESSION_SECRET],
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: NODE_ENV === "production",
  });
}
export function createIdentitySessionStorage() {
  return createCookieSessionStorage();
}
export function getIdentitySessionMiddleware() {
  return session(createIdentitySessionCookie(), createIdentitySessionStorage());
}
