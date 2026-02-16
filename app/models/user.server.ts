import { eq } from 'drizzle-orm';
import { getDb } from '#/app/db/client.server';
import { users, type User } from '#/app/db/schema';

export async function getUserById(id: User['id']): Promise<User | undefined> {
  const db = getDb();
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByEmail(email: User['email']): Promise<User | undefined> {
  const db = getDb();
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

/**
 * Update an existing user's profile on login.
 * Returns null if user doesn't exist (allowlist model - users must be manually added).
 */
export async function updateUserOnLogin({
  email,
  name,
  avatarUrl,
}: {
  email: string;
  name: string | null;
  avatarUrl: string | null;
}): Promise<User | null> {
  const db = getDb();
  const existingUser = await getUserByEmail(email);

  if (!existingUser) {
    return null;
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      name,
      avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existingUser.id))
    .returning();

  return updatedUser;
}
