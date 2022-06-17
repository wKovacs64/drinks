import { db } from '~/utils/db.server';

export interface DrinksCache {
  get: (key: string) => Promise<string | void>;
  put: (key: string, value: string) => Promise<void>;
}

export const cache: DrinksCache = {
  get: async (key: string) => {
    const data = await db.cacheEntry.findUnique({ where: { key } });
    if (data) return data.value;
  },
  put: async (key: string, value: string) => {
    await db.cacheEntry.create({ data: { key, value } });
  },
};
