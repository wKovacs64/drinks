import { enum_, parse } from "remix/data-schema";
import type { TableRow } from "remix/data-table";
import type { getDb } from "#/app/db/client.ts";
import { users } from "#/app/db/schema.ts";
import type { IdentityService, SessionUser } from "./identity.ts";

type CreateIdentityServiceDeps = {
  db: ReturnType<typeof getDb>;
};

export function createIdentityService({ db }: CreateIdentityServiceDeps): IdentityService {
  return {
    async admitUser({ email, emailVerified, name, avatarUrl }) {
      if (!email || emailVerified !== true) return null;
      const existingUser = await db.findOne(users, { where: { email } });

      if (!existingUser) return null;

      const updatedUser = await db.update(users, existingUser.id, {
        name: name ?? null,
        avatar_url: avatarUrl ?? null,
        updated_at: Math.floor(Date.now() / 1000),
      });

      return toSessionUser(updatedUser);
    },
    async getSessionUser({ userId }) {
      const row = await db.find(users, userId);

      return row ? toSessionUser(row) : null;
    },
  };
}

/** `c.enum` does not validate stored values; an invalid `role` throws `ValidationError`. */
function toSessionUser(user: TableRow<typeof users>): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    role: parse(enum_(["user", "admin"]), user.role),
  };
}
