import type { getDb } from "#/app/db/client.ts";
import { users, readUser, type User } from "#/app/db/schema.ts";
import type { IdentityService, SessionUser } from "./identity.ts";

type CreateIdentityServiceDeps = {
  db: ReturnType<typeof getDb>;
};

export function createIdentityService({ db }: CreateIdentityServiceDeps): IdentityService {
  return {
    async admitUser({ email, emailVerified, name, avatarUrl }) {
      if (!email || !emailVerified) return null;
      const existingUser = await db.findOne(users, { where: { email } });
      if (!existingUser) return null;
      const updatedUser = await db.update(users, existingUser.id, {
        name: name ?? null,
        avatar_url: avatarUrl ?? null,
        updated_at: Math.floor(Date.now() / 1000),
      });
      return toSessionUser(readUser(updatedUser));
    },
    async getSessionUser({ userId }) {
      const row = await db.find(users, userId);
      return row ? toSessionUser(readUser(row)) : null;
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
