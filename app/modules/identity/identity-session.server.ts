import { createCookie, createCookieSessionStorage } from "react-router";
import { getEnvVars } from "#/app/core/env.server";
import type { AuthenticatedUser } from "./identity";

export const sessionCookie = {
  name: "__session",
} as const;

type SessionData = {
  user?: AuthenticatedUser;
  returnTo?: string;
};

type SessionFlashData = Record<string, never>;

function getSessionStorage() {
  const { SESSION_SECRET, NODE_ENV } = getEnvVars();

  return createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: createCookie(sessionCookie.name, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secrets: [SESSION_SECRET],
      secure: NODE_ENV === "production",
    }),
  });
}

export function getSession(cookieHeader?: string | null) {
  return getSessionStorage().getSession(cookieHeader);
}

export function commitSession(session: Awaited<ReturnType<typeof getSession>>) {
  return getSessionStorage().commitSession(session);
}

export function destroySession(session: Awaited<ReturnType<typeof getSession>>) {
  return getSessionStorage().destroySession(session);
}

export async function getRawSessionCookieValue(user: AuthenticatedUser): Promise<string> {
  const session = await getSession();
  session.set("user", user);
  const serializedCookie = await commitSession(session);
  const [cookiePair] = serializedCookie.split(";");
  const value = cookiePair.split("=").slice(1).join("=");
  return value;
}
