import { redirect, href, data } from 'react-router';
import slugify from '@sindresorhus/slugify';
import { getSession, commitSession } from '#/app/auth/session.server';
import { createDrink } from '#/app/models/drink.server';
import { uploadImageOrPlaceholder } from '#/app/utils/imagekit.server';
import { DrinkForm } from '#/app/admin/drink-form';
import { parseImageUpload } from '#/app/utils/parse-image-upload.server';
import { purgeSearchCache } from '#/app/search/cache.server';
import { purgeDrinkCache } from '#/app/utils/fastly.server';
import { drinkSchema } from '#/app/validation/drink';
import type { Route } from './+types/admin.drinks.new';

export default function NewDrinkPage({ actionData }: Route.ComponentProps) {
  return (
    <div>
      <title>New Drink | drinks.fyi</title>
      <h1 className="mb-6 text-xl font-medium text-zinc-200">Add New Drink</h1>
      <DrinkForm action={href('/admin/drinks/new')} errors={actionData?.errors} />
    </div>
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { formData, imageUpload, imageError } = await parseImageUpload(request);

  if (imageError) {
    return data({ errors: [imageError] }, { status: 400 });
  }

  const title = String(formData.get('title') ?? '');
  const slug = String(formData.get('slug') ?? '') || slugify(title);

  const result = drinkSchema.safeParse({
    title,
    slug,
    ingredients: String(formData.get('ingredients') ?? ''),
    calories: String(formData.get('calories') ?? ''),
    tags: String(formData.get('tags') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    rank: String(formData.get('rank') ?? ''),
  });
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
  } else {
    // Fallback for tests or when no image provided
    imageUrl = `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(result.data.slug)}`;
    imageFileId = 'test-placeholder';
  }

  const drink = await createDrink({
    ...result.data,
    imageUrl,
    imageFileId,
  });

  try {
    purgeSearchCache();
    await purgeDrinkCache({ slug: drink.slug, tags: drink.tags });
  } catch (error) {
    // Cache invalidation failures shouldn't block the request
    console.error('Cache invalidation failed:', error);
  }

  const session = await getSession(request.headers.get('Cookie'));
  session.flash('toast', { kind: 'success' as const, message: `${result.data.title} created!` });
  return redirect(href('/admin/drinks'), {
    headers: { 'Set-Cookie': await commitSession(session) },
  });
}
