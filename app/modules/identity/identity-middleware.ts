import { parseSafe, string } from "remix/data-schema";
import { auth, createSessionAuthScheme } from "remix/middleware/auth";
import { getDb } from "#/app/db/client.ts";
import { createIdentityService } from "./identity-service.ts";
import type { SessionUser } from "./identity.ts";

export function getIdentityAuthMiddleware() {
  return auth({
    schemes: [
      createSessionAuthScheme<SessionUser, string>({
        read(session) {
          const userId = parseSafe(string(), session.get("userId"));

          return userId.success ? userId.value : null;
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
