import { redirect, href, data } from 'react-router';
import { invariantResponse } from '@epic-web/invariant';
import { getDrinkBySlug, updateDrink } from '#/app/models/drink.server';
import { uploadImageOrPlaceholder, deleteImage } from '#/app/utils/imagekit.server';
import { DrinkForm } from '#/app/admin/drink-form';
import { parseImageUpload } from '#/app/utils/parse-image-upload.server';
import { purgeSearchCache } from '#/app/search/cache.server';
import { purgeDrinkCache } from '#/app/utils/fastly.server';
import { getSession, commitSession } from '#/app/auth/session.server';
import { drinkFormSchema } from '#/app/validation/drink';
import type { Route } from './+types/admin.drinks.$slug.edit';

export async function loader({ params }: Route.LoaderArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, 'Drink not found', { status: 404 });
  return { drink };
}

export default function EditDrinkPage({ loaderData, actionData }: Route.ComponentProps) {
  const { drink } = loaderData;

  return (
    <div>
      <title>{`Edit ${drink.title} | drinks.fyi`}</title>
      <h1 className="mb-6 text-2xl font-medium text-zinc-200">Edit Drink</h1>
      <DrinkForm
        drink={drink}
        action={href('/admin/drinks/:slug/edit', { slug: drink.slug })}
        errors={actionData?.errors}
      />
    </div>
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const drink = await getDrinkBySlug(params.slug);
  invariantResponse(drink, 'Drink not found', { status: 404 });

  const { formData, imageUpload, imageError } = await parseImageUpload(request);

  if (imageError) {
    return data({ errors: [imageError] }, { status: 400 });
  }

  const existingImageUrl = String(formData.get('existingImageUrl') ?? '');

  const result = drinkFormSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return data({ errors: result.error.issues.map((issue) => issue.message) }, { status: 400 });
  }

  let imageUrl: string;
  let imageFileId: string;

  if (imageUpload) {
    const uploadResult = await uploadImageOrPlaceholder(
      imageUpload.buffer,
      `${result.data.slug}.jpg`,
    );
    imageUrl = uploadResult.url;
    imageFileId = uploadResult.fileId;

    if (drink.imageFileId && drink.imageFileId !== 'test-placeholder') {
      try {
        await deleteImage(drink.imageFileId);
      } catch (error) {
        console.error('Failed to delete old image:', error);
      }
    }
  } else if (existingImageUrl) {
    imageUrl = drink.imageUrl;
    imageFileId = drink.imageFileId;
  } else {
    imageUrl = `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(result.data.slug)}`;
    imageFileId = 'test-placeholder';
  }

  // Collect old tags for cache purge (in case they changed)
  const oldTags = drink.tags;

  await updateDrink(drink.id, {
    ...result.data,
    imageUrl,
    imageFileId,
  });

  try {
    purgeSearchCache();
    const allTags = [...new Set([...oldTags, ...result.data.tags])];
    await purgeDrinkCache({ slug: result.data.slug, tags: allTags });
    // Also purge the old slug if it changed
    if (params.slug !== result.data.slug) {
      await purgeDrinkCache({ slug: params.slug, tags: [] });
    }
  } catch (error) {
    // Cache invalidation failures shouldn't block the request
    console.error('Cache invalidation failed:', error);
  }

  const session = await getSession(request.headers.get('Cookie'));
  session.flash('toast', { kind: 'success' as const, message: `${result.data.title} updated!` });
  return redirect(href('/admin/drinks'), {
    headers: { 'Set-Cookie': await commitSession(session) },
  });
}
