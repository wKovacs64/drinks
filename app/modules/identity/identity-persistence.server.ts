import { eq } from "drizzle-orm";
import { users, type User } from "#/app/db/schema";
import type { getDb } from "#/app/db/client.server";

export async function getIdentityUser(
  db: ReturnType<typeof getDb>,
  userId: User["id"],
): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function updateIdentityUserOnLogin(
  db: ReturnType<typeof getDb>,
  input: {
    email: string;
    name: string | null;
    avatarUrl: string | null;
  },
): Promise<User | null> {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (!existingUser) {
    return null;
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      name: input.name,
      avatarUrl: input.avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existingUser.id))
    .returning();

  return updatedUser;
}
