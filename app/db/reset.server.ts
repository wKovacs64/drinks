import { TEST_ADMIN_USER, TEST_DRINKS } from '../../playwright/seed-data';
import { getDb } from './client.server';
import { users, drinks } from './schema';

export async function resetAndSeedDatabase() {
  const db = getDb();

  // Delete all data (order matters if there are foreign keys)
  await db.delete(drinks);
  await db.delete(users);

  // Seed test data
  await db.insert(users).values(TEST_ADMIN_USER);
  await db.insert(drinks).values(TEST_DRINKS);

  return { success: true };
}
