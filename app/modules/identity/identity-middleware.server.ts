import { auth, createSessionAuthScheme } from "remix/middleware/auth";
import { getDb } from "#/app/db/client.server.ts";
import { getIdentityUser } from "./identity-persistence.server.ts";
import type { SessionUser } from "./identity.ts";
export function getIdentityAuthMiddleware() {
  return auth({
    schemes: [
      createSessionAuthScheme<SessionUser, string>({
        read(session) {
          const value = session.get("userId");
          return typeof value === "string" ? value : null;
        },
        async verify(userId) {
          return (await getIdentityUser(getDb(), userId)) ?? null;
        },
        invalidate(session) {
          session.unset("userId");
        },
      }),
    ],
  });
}
