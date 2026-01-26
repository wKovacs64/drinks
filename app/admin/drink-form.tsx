import { Form, useNavigation } from 'react-router';
import { useState } from 'react';
import type { Drink } from '#/app/db/schema';
import { ImageCrop } from './image-crop';

type DrinkFormProps = {
  drink?: Drink;
  action: string;
};

export function DrinkForm({ drink, action }: DrinkFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(drink?.imageUrl ?? null);

  const handleCropComplete = (blob: Blob) => {
    setCroppedImage(blob);
    setImagePreview(URL.createObjectURL(blob));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    if (croppedImage) {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(croppedImage);
      });

      formData.set('imageData', base64);

      const response = await fetch(action, {
        method: 'POST',
        body: formData,
      });

      if (response.redirected) {
        window.location.href = response.url;
      }
    }
  };

  return (
    <Form method="post" action={action} onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          type="text"
          name="title"
          id="title"
          defaultValue={drink?.title}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          Slug
        </label>
        <input
          type="text"
          name="slug"
          id="slug"
          defaultValue={drink?.slug}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Image</span>
        {imagePreview && (
          <img src={imagePreview} alt="Preview" className="mb-4 h-32 w-32 rounded object-cover" />
        )}
        <ImageCrop onCropComplete={handleCropComplete} />
        <input type="hidden" name="imageData" />
        {drink?.imageUrl && !croppedImage && (
          <input type="hidden" name="existingImageUrl" value={drink.imageUrl} />
        )}
      </div>

      <div>
        <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700">
          Ingredients (one per line)
        </label>
        <textarea
          name="ingredients"
          id="ingredients"
          rows={5}
          defaultValue={drink?.ingredients.join('\n')}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="calories" className="block text-sm font-medium text-gray-700">
          Calories
        </label>
        <input
          type="number"
          name="calories"
          id="calories"
          defaultValue={drink?.calories}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          name="tags"
          id="tags"
          defaultValue={drink?.tags.join(', ')}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes (markdown)
        </label>
        <textarea
          name="notes"
          id="notes"
          rows={5}
          defaultValue={drink?.notes ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="rank" className="block text-sm font-medium text-gray-700">
          Rank
        </label>
        <input
          type="number"
          name="rank"
          id="rank"
          defaultValue={drink?.rank ?? 0}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : drink ? 'Update Drink' : 'Create Drink'}
        </button>
      </div>
    </Form>
  );
}
