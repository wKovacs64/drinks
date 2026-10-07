import type { User } from "#/app/db/schema.ts";

export type SessionUser = {
  id: User["id"];
  email: User["email"];
  name: User["name"];
  avatarUrl: User["avatarUrl"];
  role: User["role"];
};

export interface IdentityService {
  admitUser(input: {
    email: string | undefined;
    emailVerified: boolean | undefined;
    name: string | undefined;
    avatarUrl: string | undefined;
  }): Promise<SessionUser | null>;
  getSessionUser(input: { userId: User["id"] }): Promise<SessionUser | null>;
}

export { createIdentityService } from "./identity-service.ts";
export { initiateLogin, authenticate, logout } from "./identity-auth-flows.ts";
export {
  getIdentitySessionMiddleware,
  getRawSessionCookieValue,
  sessionCookie,
} from "./identity-session.ts";
export { getIdentityAuthMiddleware } from "./identity-middleware.ts";
export { createReturnToUrl, safeRedirectTo } from "./identity-navigation.ts";
