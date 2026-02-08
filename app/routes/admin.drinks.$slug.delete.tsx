import { redirect, data, href } from 'react-router';
import { invariantResponse } from '@epic-web/invariant';
import { getDrinkBySlug, deleteDrink } from '#/app/models/drink.server';
import { deleteImage } from '#/app/utils/imagekit.server';
import { purgeSearchCache } from '#/app/routes/_app.search/cache.server';
import { purgeDrinkCache } from '#/app/utils/fastly.server';
import { getSession, commitSession } from '#/app/auth/session.server';
import type { Route } from './+types/admin.drinks.$slug.delete';

export async function loader() {
  return redirect(href('/admin/drinks'));
}

export async function action({ request, params }: Route.ActionArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, 'Drink not found', { status: 404 });

  if (drink.imageFileId && drink.imageFileId !== 'test-placeholder') {
    try {
      await deleteImage(drink.imageFileId);
    } catch (error) {
      console.error('Failed to delete drink image:', error);
    }
  }

  await deleteDrink(drink.id);

  try {
    purgeSearchCache();
    await purgeDrinkCache({ slug: drink.slug, tags: drink.tags });
  } catch (error) {
    // Cache invalidation failures shouldn't block the request
    console.error('Cache invalidation failed:', error);
  }

  const session = await getSession(request.headers.get('Cookie'));
  session.flash('toast', { kind: 'success' as const, message: `${drink.title} deleted!` });
  return data({ success: true }, { headers: { 'Set-Cookie': await commitSession(session) } });
}
