import type { getDb } from "#/app/db/client.server.ts";
import type { User } from "#/app/db/schema.ts";
import type { IdentityService, SessionUser } from "./identity.ts";
import { getIdentityUser } from "./identity-persistence.server.ts";

export { initiateLogin, authenticate, logout } from "./identity-auth-flows.server.ts";
export {
  getIdentitySessionMiddleware,
  getRawSessionCookieValue,
  sessionCookie,
} from "./identity-session.server.ts";
export { getIdentityAuthMiddleware } from "./identity-middleware.server.ts";
export { createReturnToUrl, safeRedirectTo } from "./identity-navigation.server.ts";

type CreateIdentityServiceDeps = {
  db: ReturnType<typeof getDb>;
};

export function createIdentityService({ db }: CreateIdentityServiceDeps): IdentityService {
  return {
    async getSessionUser({ userId }) {
      const user = await getIdentityUser(db, userId);
      return user ? toSessionUser(user) : null;
    },
  };
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}
