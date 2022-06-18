import { db } from '~/utils/db.server';

export const cache = {
  async get(key: string) {
    const cachedData = await db.cacheEntry.findUnique({ where: { key } });
    if (cachedData) {
      try {
        return JSON.parse(cachedData.value);
      } catch {
        // noop, cache failures shouldn't break the app
      }
    }
  },
  async put(key: string, value: any) {
    try {
      await db.cacheEntry.create({
        data: { key, value: JSON.stringify(value) },
      });
    } catch {
      // noop, cache failures shouldn't break the app
    }
  },
};
