import { clientEntry, on, ref, type Handle } from "remix/component";
import slugify from "@sindresorhus/slugify";
import type { DrinkEditor } from "#/app/modules/drinks/drinks.ts";
import { ImageCrop } from "#/app/actions/admin/drinks/public/image-crop.tsx";
const STATUS_OPTIONS: {
  value: DrinkEditor["initialValues"]["status"];
  label: string;
  activeClass: string;
}[] = [
  {
    value: "published",
    label: "Published",
    activeClass: "peer-checked:bg-green-500/20 peer-checked:text-green-400",
  },
  {
    value: "unpublished",
    label: "Unpublished",
    activeClass: "peer-checked:bg-zinc-500/20 peer-checked:text-zinc-400",
  },
];

type DrinkFormProps = { editor: DrinkEditor; action: string; errors?: string[] };

export const DrinkForm = clientEntry(
  import.meta.url,
  function DrinkForm(handle: Handle<DrinkFormProps>) {
    // Remix reconciles keyed siblings inside fragments.
    return () => (
      <>
        <DrinkEditorForm key={handle.props.action} {...handle.props} />
      </>
    );
  },
);

function DrinkEditorForm(handle: Handle<DrinkFormProps>) {
  const { editor, action } = handle.props;
  let isSubmitting = false;
  let getCroppedImage: (() => Promise<Blob | null>) | undefined;
  let isSlugManuallyEdited = false;
  let slugValue = editor.initialValues.slug;
  let imageRequired = false;
  let saveFailed = false;
  // The runtime can't await the crop, so the first submit waits for it and resubmits natively.
  let isResubmitting = false;
  handle.frame.addEventListener(
    "reloadComplete",
    () => {
      if (!isSubmitting) return;
      isSubmitting = false;
      void handle.update();
    },
    { signal: handle.signal },
  );
  // A failed frame reload rejects the save's navigation after reloadComplete; superseded
  // navigations abort.
  let isNavigating = false;
  const reportFailedSave = ref<HTMLFormElement>((_form, signal) => {
    window.navigation?.addEventListener(
      "navigatesuccess",
      () => {
        isNavigating = false;
      },
      { signal },
    );
    window.navigation?.addEventListener(
      "navigateerror",
      (event) => {
        if (!isNavigating) return;
        isNavigating = false;
        if (event.error instanceof DOMException && event.error.name === "AbortError") return;
        saveFailed = true;
        void handle.update();
      },
      { signal },
    );
  });
  function setSlugValue(value: string) {
    slugValue = value;
    void handle.update();
  }
  function setIsSlugManuallyEdited(value: boolean) {
    isSlugManuallyEdited = value;
  }
  async function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    if (isResubmitting) return;
    event.preventDefault();
    if (isSubmitting) return;
    const form = event.currentTarget;
    imageRequired = false;
    saveFailed = false;
    isSubmitting = true;
    void handle.update();
    const image = (await getCroppedImage?.()) ?? null;
    // Browsers ignore requestSubmit while the original submit event is still dispatching.
    await new Promise((resolve) => setTimeout(resolve));
    if (handle.signal.aborted) return;
    if (!image && !editor.imageUrl) {
      imageRequired = true;
      isSubmitting = false;
      void handle.update();
      return;
    }
    const imageInput = form.elements.namedItem("imageFile");
    if (image && imageInput instanceof HTMLInputElement) {
      const files = new DataTransfer();
      files.items.add(new File([image], "cropped.jpg", { type: image.type }));
      imageInput.files = files.files;
    }
    isNavigating = true;
    isResubmitting = true;
    try {
      form.requestSubmit();
    } finally {
      isResubmitting = false;
    }
  }
  return () => {
    const errors = saveFailed
      ? ["Unable to save drink. Please try again."]
      : (handle.props.errors ?? []);
    return (
      <form
        method="post"
        action={action}
        encType="multipart/form-data"
        mix={[reportFailedSave, on<HTMLFormElement, "submit">("submit", handleSubmit)]}
        className="space-y-6"
      >
        {errors.length > 0 ? (
          <div
            role="alert"
            className="rounded border border-red-700 bg-red-950/50 px-4 py-3 text-red-300"
          >
            <p className="font-medium">Please fix the following errors:</p>
            <ul className="mt-1 list-inside list-disc">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-semibold tracking-wider text-zinc-500 uppercase"
          >
            Title
          </label>
          <input
            type="text"
            name="title"
            id="title"
            defaultValue={editor.initialValues.title}
            required
            mix={on<HTMLInputElement, "input">("input", (event) => {
              if (editor.mode === "create" && !isSlugManuallyEdited) {
                setSlugValue(slugify(event.currentTarget.value));
              }
            })}
            className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="slug"
            className="block text-sm font-semibold tracking-wider text-zinc-500 uppercase"
          >
            Slug
          </label>
          <input
            type="text"
            name="slug"
            id="slug"
            value={slugValue}
            required
            mix={on<HTMLInputElement, "input">("input", (event) => {
              setIsSlugManuallyEdited(true);
              setSlugValue(event.currentTarget.value);
            })}
            className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        <div>
          <span className="block text-sm font-semibold tracking-wider text-zinc-500 uppercase">
            Image
          </span>
          <div className="mt-2">
            <ImageCrop
              existingImageUrl={editor.imageUrl}
              onCropReady={(getImage) => {
                getCroppedImage = getImage;
              }}
            />
          </div>
          {imageRequired ? <p className="mt-1 text-red-400">Image is required</p> : null}
        </div>

        <div>
          <label
            htmlFor="ingredients"
            className="block text-sm font-semibold tracking-wider text-zinc-500 uppercase"
          >
            Ingredients (one per line)
          </label>
          <textarea
            name="ingredients"
            id="ingredients"
            rows={5}
            defaultValue={editor.initialValues.ingredients}
            required
            className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="calories"
            className="block text-sm font-semibold tracking-wider text-zinc-500 uppercase"
          >
            Calories
          </label>
          <input
            type="number"
            name="calories"
            id="calories"
            defaultValue={editor.initialValues.calories}
            min={0}
            required
            className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="tags"
            className="block text-sm font-semibold tracking-wider text-zinc-500 uppercase"
          >
            Tags (comma-separated)
          </label>
          <input
            type="text"
            name="tags"
            id="tags"
            defaultValue={editor.initialValues.tags}
            required
            className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-semibold tracking-wider text-zinc-500 uppercase"
          >
            Notes (markdown)
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={12}
            defaultValue={editor.initialValues.notes}
            className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="rank"
            className="block text-sm font-semibold tracking-wider text-zinc-500 uppercase"
          >
            Rank
          </label>
          <input
            type="number"
            name="rank"
            id="rank"
            defaultValue={editor.initialValues.rank}
            className="mt-2 block w-full rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        <fieldset>
          <legend className="block text-sm font-semibold tracking-wider text-zinc-500 uppercase">
            Status
          </legend>
          <div className="mt-2 inline-flex divide-x divide-zinc-700 rounded-sm border border-zinc-700">
            {STATUS_OPTIONS.map((option) => (
              <label key={option.value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  defaultChecked={editor.initialValues.status === option.value}
                  className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                />
                <span
                  className={`block bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-500 transition-colors peer-focus-visible:outline peer-focus-visible:outline-amber-500 hover:text-zinc-300 ${option.activeClass}`}
                >
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : editor.mode === "edit" ? "Update Drink" : "Create Drink"}
          </button>
        </div>
      </form>
    );
  };
}
