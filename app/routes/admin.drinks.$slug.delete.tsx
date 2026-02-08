import { redirect, data } from 'react-router';
import { invariantResponse } from '@epic-web/invariant';
import { getDrinkBySlug, deleteDrink } from '#/app/models/drink.server';
import { deleteImage } from '#/app/utils/imagekit.server';
import { purgeSearchCache } from '#/app/routes/_app.search/cache.server';
import { purgeDrinkCache } from '#/app/utils/fastly.server';
import { getSession, commitSession } from '#/app/auth/session.server';
import type { Route } from './+types/admin.drinks.$slug.delete';

// This route only accepts POST requests
export async function loader() {
  // Redirect GET requests to the drinks list
  return redirect('/admin/drinks');
}

export async function action({ request, params }: Route.ActionArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, 'Drink not found', { status: 404 });

  // Delete the image if it's not a placeholder
  if (drink.imageFileId && drink.imageFileId !== 'test-placeholder') {
    try {
      await deleteImage(drink.imageFileId);
    } catch (error) {
      console.error('Failed to delete drink image:', error);
    }
  }

  // Delete the drink from the database
  await deleteDrink(drink.id);

  // Invalidate caches
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
