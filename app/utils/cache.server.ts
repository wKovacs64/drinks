import { count, eq, sql } from 'drizzle-orm';
import { db, cacheEntry } from '~/db.server/drizzle';

export const cache = {
  async get(key: string) {
    const cachedData = await db.query.cacheEntry.findFirst({
      where: eq(cacheEntry.key, key),
    });
    if (cachedData) {
      try {
        return JSON.parse(cachedData.value);
      } catch {
        // noop, cache failures shouldn't break the app
      }
    }
  },
  async set(key: string, value: Parameters<typeof JSON.stringify>[0]) {
    try {
      await db.insert(cacheEntry).values({
        key,
        value: JSON.stringify(value),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    } catch {
      // noop, cache failures shouldn't break the app
    }
  },
  async has(key: string) {
    try {
      const [{ count: cacheEntryCount }] = await db
        .select({ count: count() })
        .from(cacheEntry)
        .where(eq(cacheEntry.key, key));
      return cacheEntryCount > 0;
    } catch {
      return false;
    }
  },
  async delete(key: string) {
    try {
      await db.delete(cacheEntry).where(eq(cacheEntry.key, key));
    } catch {
      // noop, cache failures shouldn't break the app
    }
  },
  async clear() {
    try {
      await db.delete(cacheEntry);
    } catch {
      // noop, cache failures shouldn't break the app
    }
  },
};
