import { users, readUser, type User } from "#/app/db/schema.ts";
import type { getDb } from "#/app/db/client.server.ts";
export async function getIdentityUser(
  db: ReturnType<typeof getDb>,
  userId: User["id"],
): Promise<User | undefined> {
  const row = await db.find(users, userId);
  return row ? readUser(row) : undefined;
}
export async function updateIdentityUserOnLogin(
  db: ReturnType<typeof getDb>,
  input: { email: string; name: string | null; avatarUrl: string | null },
): Promise<User | null> {
  const existingUser = await db.findOne(users, { where: { email: input.email } });
  if (!existingUser) return null;
  return readUser(
    await db.update(users, existingUser.id, {
      name: input.name,
      avatar_url: input.avatarUrl,
      updated_at: Math.floor(Date.now() / 1000),
    }),
  );
}
