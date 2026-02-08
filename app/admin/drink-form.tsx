import { useRef, useState } from 'react';
import { Form, useNavigation, useSubmit } from 'react-router';
import slugify from '@sindresorhus/slugify';
import type { Drink } from '#/app/db/schema';
import { ImageCrop, type ImageCropHandle } from './image-crop';

type DrinkFormProps = {
  drink?: Drink;
  action: string;
};

export function DrinkForm({ drink, action }: DrinkFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const imageCropRef = useRef<ImageCropHandle>(null);
  const submit = useSubmit();
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [slugValue, setSlugValue] = useState(drink?.slug ?? '');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const croppedBlob = await imageCropRef.current?.getCroppedImage();

    if (croppedBlob) {
      const formData = new FormData(form);
      formData.set('imageFile', croppedBlob, 'cropped.jpg');
      await submit(formData, { method: 'post', action, encType: 'multipart/form-data' });
    } else {
      await submit(form, { method: 'post', action });
    }
  };

  return (
    <Form
      method="post"
      action={action}
      encType="multipart/form-data"
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="title"
          className="block text-xs font-semibold tracking-wider text-zinc-500 uppercase"
        >
          Title
        </label>
        <input
          type="text"
          name="title"
          id="title"
          defaultValue={drink?.title}
          required
          onChange={(event) => {
            if (!drink && !isSlugManuallyEdited) {
              setSlugValue(slugify(event.target.value));
            }
          }}
          className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="slug"
          className="block text-xs font-semibold tracking-wider text-zinc-500 uppercase"
        >
          Slug
        </label>
        <input
          type="text"
          name="slug"
          id="slug"
          value={slugValue}
          required
          onChange={(event) => {
            setIsSlugManuallyEdited(true);
            setSlugValue(event.target.value);
          }}
          className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
        />
      </div>

      <div>
        <span className="block text-xs font-semibold tracking-wider text-zinc-500 uppercase">
          Image
        </span>
        <div className="mt-2">
          <ImageCrop ref={imageCropRef} existingImageUrl={drink?.imageUrl} />
        </div>
        {drink?.imageUrl && <input type="hidden" name="existingImageUrl" value={drink.imageUrl} />}
      </div>

      <div>
        <label
          htmlFor="ingredients"
          className="block text-xs font-semibold tracking-wider text-zinc-500 uppercase"
        >
          Ingredients (one per line)
        </label>
        <textarea
          name="ingredients"
          id="ingredients"
          rows={5}
          defaultValue={drink?.ingredients.join('\n')}
          required
          className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="calories"
          className="block text-xs font-semibold tracking-wider text-zinc-500 uppercase"
        >
          Calories
        </label>
        <input
          type="number"
          name="calories"
          id="calories"
          defaultValue={drink?.calories}
          min={0}
          required
          className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="tags"
          className="block text-xs font-semibold tracking-wider text-zinc-500 uppercase"
        >
          Tags (comma-separated)
        </label>
        <input
          type="text"
          name="tags"
          id="tags"
          defaultValue={drink?.tags.join(', ')}
          required
          className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-xs font-semibold tracking-wider text-zinc-500 uppercase"
        >
          Notes (markdown)
        </label>
        <textarea
          name="notes"
          id="notes"
          rows={5}
          defaultValue={drink?.notes ?? ''}
          className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="rank"
          className="block text-xs font-semibold tracking-wider text-zinc-500 uppercase"
        >
          Rank
        </label>
        <input
          type="number"
          name="rank"
          id="rank"
          defaultValue={drink?.rank ?? 0}
          className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : drink ? 'Update Drink' : 'Create Drink'}
        </button>
      </div>
    </Form>
  );
}
