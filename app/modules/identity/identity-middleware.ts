import { auth, createSessionAuthScheme } from "remix/middleware/auth";
import { getDb } from "#/app/db/client.ts";
import { createIdentityService } from "./identity-service.ts";
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
          return createIdentityService({ db: getDb() }).getSessionUser({ userId });
        },
        invalidate(session) {
          session.unset("userId");
        },
      }),
    ],
  });
}
