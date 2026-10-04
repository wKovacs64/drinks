import type { User } from "#/app/db/schema.ts";

export type SessionUser = {
  id: User["id"];
  email: User["email"];
  name: User["name"];
  avatarUrl: User["avatarUrl"];
  role: User["role"];
};

export interface IdentityService {
  getSessionUser(input: { userId: User["id"] }): Promise<SessionUser | null>;
}
