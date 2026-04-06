import type { getDb } from "#/app/db/client.server";
import type { User } from "#/app/db/schema";
import type { IdentityService, SessionUser } from "./identity";
import { getIdentityUser } from "./identity-persistence.server";

export { initiateLogin, authenticate, logout } from "./identity-auth-flows.server";
export { getUserFromContext, getOptionalUserFromContext } from "./identity-context.server";
export { requireUser, optionalUser, requireRole } from "./identity-middleware.server";
export {
  commitSession,
  destroySession,
  getSession,
  getRawSessionCookieValue,
  sessionCookie,
} from "./identity-session.server";
export { createReturnToUrl, safeRedirectTo } from "./identity-navigation.server";

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
