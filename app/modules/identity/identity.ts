import type { User } from "#/app/db/schema";

export type SessionUser = {
  id: User["id"];
  email: User["email"];
  name: User["name"];
  avatarUrl: User["avatarUrl"];
  role: User["role"];
};

export type AuthenticatedUser = SessionUser;

export interface IdentityService {
  getSessionUser(input: { userId: User["id"] }): Promise<SessionUser | null>;
}
