import type { LoaderFunction } from '@remix-run/node';
import { prisma } from '~/utils/db.server';

export const loader: LoaderFunction = async () => {
  try {
    await prisma.cacheEntry.count();
    return new Response(null, { status: 200 });
  } catch (error: unknown) {
    console.log('❌ Healthcheck failed', { error });
    return new Response(null, { status: 500 });
  }
};
