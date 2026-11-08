import type { TableRow } from "remix/data-table";
import type { users } from "#/app/db/schema.ts";

type UserRow = TableRow<typeof users>;

export type SessionUser = {
  id: UserRow["id"];
  email: UserRow["email"];
  name: UserRow["name"];
  avatarUrl: UserRow["avatar_url"];
  role: UserRow["role"];
};

export interface IdentityService {
  admitUser: (input: {
    email: string | undefined;
    emailVerified: boolean | undefined;
    name: string | undefined;
    avatarUrl: string | undefined;
  }) => Promise<SessionUser | null>;
  getSessionUser: (input: { userId: UserRow["id"] }) => Promise<SessionUser | null>;
}

export { createIdentityService } from "./identity-service.ts";

export { getIdentitySessionMiddleware, sessionCookie } from "./identity-session.ts";

export { getIdentityAuthMiddleware } from "./identity-middleware.ts";
