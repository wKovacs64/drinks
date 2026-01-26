import { redirect } from 'react-router';
import { createDrink } from '#/app/models/drink.server';
import { uploadImageOrPlaceholder } from '#/app/utils/imagekit.server';
import { generateSlug } from '#/app/utils/slug';
import { DrinkForm } from '#/app/admin/drink-form';
import { purgeSearchCache } from '#/app/routes/_app.search/cache.server';
import { purgeDrinkCache } from '#/app/utils/fastly.server';
import type { Route } from './+types/admin.drinks.new';

export default function NewDrinkPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Add New Drink</h1>
      <div className="rounded-lg bg-white p-6 shadow">
        <DrinkForm action="/admin/drinks/new" />
      </div>
    </div>
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const title = String(formData.get('title') ?? '');
  const slug = String(formData.get('slug') ?? '') || generateSlug(title);
  const imageData = String(formData.get('imageData') ?? '');
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

  if (imageData && imageData.startsWith('data:')) {
    const base64Data = imageData.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const uploadResult = await uploadImageOrPlaceholder(imageBuffer, `${slug}.jpg`);
    imageUrl = uploadResult.url;
    imageFileId = uploadResult.fileId;
  } else {
    // Fallback for tests or when no image provided
    imageUrl = `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(slug)}`;
    imageFileId = 'test-placeholder';
  }

  const drink = await createDrink({
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

  // Invalidate caches
  try {
    purgeSearchCache();
    await purgeDrinkCache({ slug: drink.slug, tags: drink.tags });
  } catch (error) {
    // Cache invalidation failures shouldn't block the request
    console.error('Cache invalidation failed:', error);
  }

  return redirect('/admin/drinks');
}
