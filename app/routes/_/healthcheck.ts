import type { LoaderFunction } from '@remix-run/node';
import { db } from '~/utils/db.server';

export const loader: LoaderFunction = async () => {
  try {
    await db.cacheEntry.count();
    return new Response(null, { status: 200 });
  } catch (error: unknown) {
    console.log('❌ Healthcheck failed', { error });
    return new Response(null, { status: 500 });
  }
};
