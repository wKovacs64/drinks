import { prisma } from '~/utils/db.server';

export const cache = {
  async get(key: string) {
    const cachedData = await prisma.cacheEntry.findUnique({ where: { key } });
    if (cachedData) {
      try {
        return JSON.parse(cachedData.value);
      } catch {
        // noop, cache failures shouldn't break the app
      }
    }
  },
  async set(key: string, value: any) {
    try {
      await prisma.cacheEntry.create({
        data: { key, value: JSON.stringify(value) },
      });
    } catch {
      // noop, cache failures shouldn't break the app
    }
  },
  async has(key: string) {
    try {
      return (await prisma.cacheEntry.count({ where: { key } })) > 0;
    } catch {
      return false;
    }
  },
  async delete(key: string) {
    try {
      await prisma.cacheEntry.delete({ where: { key } });
    } catch {
      // noop, cache failures shouldn't break the app
    }
  },
  async clear() {
    try {
      await prisma.cacheEntry.deleteMany();
    } catch {
      // noop, cache failures shouldn't break the app
    }
  },
};
