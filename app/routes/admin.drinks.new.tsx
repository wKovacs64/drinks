import { redirect, href, data } from 'react-router';
import { getSession, commitSession } from '#/app/auth/session.server';
import { createDrink } from '#/app/models/drink.server';
import { uploadImageOrPlaceholder } from '#/app/utils/imagekit.server';
import { DrinkForm } from '#/app/admin/drink-form';
import { parseImageUpload } from '#/app/utils/parse-image-upload.server';
import { purgeSearchCache } from '#/app/search/cache.server';
import { purgeDrinkCache } from '#/app/utils/fastly.server';
import { drinkFormSchema } from '#/app/validation/drink';
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

  const result = drinkFormSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return data({ errors: result.error.issues.map((issue) => issue.message) }, { status: 400 });
  }

  if (!imageUpload) {
    return data({ errors: ['Image is required'] }, { status: 400 });
  }

  const uploadResult = await uploadImageOrPlaceholder(
    imageUpload.buffer,
    `${result.data.slug}.jpg`,
  );
  const imageUrl = uploadResult.url;
  const imageFileId = uploadResult.fileId;

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
