import { redirect, href } from 'react-router';
import { invariantResponse } from '@epic-web/invariant';
import { parseFormData, type FileUpload } from '@remix-run/form-data-parser';
import { getDrinkBySlug, updateDrink } from '#/app/models/drink.server';
import { uploadImageOrPlaceholder, deleteImage } from '#/app/utils/imagekit.server';
import { DrinkForm } from '#/app/admin/drink-form';
import { purgeSearchCache } from '#/app/routes/_app.search/cache.server';
import { purgeDrinkCache } from '#/app/utils/fastly.server';
import { getSession, commitSession } from '#/app/auth/session.server';
import type { Route } from './+types/admin.drinks.$slug.edit';

export async function loader({ params }: Route.LoaderArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, 'Drink not found', { status: 404 });
  return { drink };
}

export default function EditDrinkPage({ loaderData }: Route.ComponentProps) {
  const { drink } = loaderData;

  return (
    <div>
      <title>{`Edit ${drink.title} | drinks.fyi`}</title>
      <h1 className="mb-6 text-xl font-medium text-zinc-200">Edit Drink</h1>
      <DrinkForm drink={drink} action={href('/admin/drinks/:slug/edit', { slug: drink.slug })} />
    </div>
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, 'Drink not found', { status: 404 });

  let imageBuffer: Buffer | undefined;
  async function uploadHandler(fileUpload: FileUpload) {
    if (fileUpload.fieldName === 'imageFile') {
      imageBuffer = Buffer.from(await fileUpload.bytes());
    }
  }
  const formData = await parseFormData(request, uploadHandler);

  const title = String(formData.get('title') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const existingImageUrl = String(formData.get('existingImageUrl') ?? '');
  const ingredients = String(formData.get('ingredients') ?? '')
    .split('\n')
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
  const calories = Number.parseInt(String(formData.get('calories') ?? ''), 10);
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const notes = String(formData.get('notes') ?? '') || null;
  const rank = Number.parseInt(String(formData.get('rank') ?? ''), 10) || 0;

  let imageUrl: string;
  let imageFileId: string;

  if (imageBuffer) {
    // New image uploaded - upload it and delete the old one
    const uploadResult = await uploadImageOrPlaceholder(imageBuffer, `${slug}.jpg`);
    imageUrl = uploadResult.url;
    imageFileId = uploadResult.fileId;

    // Delete old image if it's not a placeholder
    if (drink.imageFileId && drink.imageFileId !== 'test-placeholder') {
      try {
        await deleteImage(drink.imageFileId);
      } catch (error) {
        console.error('Failed to delete old image:', error);
      }
    }
  } else if (existingImageUrl) {
    // Keep existing image
    imageUrl = drink.imageUrl;
    imageFileId = drink.imageFileId;
  } else {
    // No image data and no existing - use placeholder
    imageUrl = `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(slug)}`;
    imageFileId = 'test-placeholder';
  }

  // Collect old tags for cache purge (in case they changed)
  const oldTags = drink.tags;

  await updateDrink(drink.id, {
    title,
    slug,
    imageUrl,
    imageFileId,
    ingredients,
    calories,
    tags,
    notes,
    rank,
  });

  // Invalidate caches - include both old and new tags
  try {
    purgeSearchCache();
    const allTags = [...new Set([...oldTags, ...tags])];
    await purgeDrinkCache({ slug, tags: allTags });
    // Also purge the old slug if it changed
    if (params.slug !== slug) {
      await purgeDrinkCache({ slug: params.slug, tags: [] });
    }
  } catch (error) {
    // Cache invalidation failures shouldn't block the request
    console.error('Cache invalidation failed:', error);
  }

  const session = await getSession(request.headers.get('Cookie'));
  session.flash('toast', { kind: 'success' as const, message: `${title} updated!` });
  return redirect('/admin/drinks', { headers: { 'Set-Cookie': await commitSession(session) } });
}
