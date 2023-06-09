import { prisma } from '~/utils/db.server.ts';

export const loader = async () => {
  try {
    await prisma.cacheEntry.count();
    return new Response(null, { status: 200 });
  } catch (error: unknown) {
    console.log('❌ Healthcheck failed', { error });
    return new Response(null, { status: 500 });
  }
};
