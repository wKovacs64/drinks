import { clientEntry, navigate, on, type Handle } from "remix/component";
import { classes } from "#/app/core/strings.ts";
import { parseSafe } from "remix/data-schema";
import {
  drinkEditorResponseSchema,
  EDITOR_RESPONSE_MEDIA_TYPE,
} from "#/app/web/admin-drink-write/editor-response.ts";
import slugify from "@sindresorhus/slugify";
import type { DrinkEditor } from "#/app/modules/drinks/drinks.ts";
import { ImageCrop } from "./image-crop.tsx";
const STATUS_OPTIONS: {
  value: DrinkEditor["initialValues"]["status"];
  label: string;
  activeClass: string;
}[] = [
  { value: "published", label: "Published", activeClass: "bg-green-500/20 text-green-400" },
  { value: "unpublished", label: "Unpublished", activeClass: "bg-zinc-500/20 text-zinc-400" },
];

export const DrinkForm = clientEntry(
  import.meta.url,
  function DrinkForm(handle: Handle<{ editor: DrinkEditor; action: string; errors?: string[] }>) {
    const { editor, action } = handle.props;
    let isSubmitting = false;
    let getCroppedImage: (() => Promise<Blob | null>) | undefined;
    let isSlugManuallyEdited = false;
    let slugValue = editor.initialValues.slug;
    let imageRequired = false;
    let statusValue = editor.initialValues.status;
    let errors = handle.props.errors;
    function setSlugValue(value: string) {
      slugValue = value;
      void handle.update();
    }
    function setIsSlugManuallyEdited(value: boolean) {
      isSlugManuallyEdited = value;
    }
    function setStatusValue(value: DrinkEditor["initialValues"]["status"]) {
      statusValue = value;
      void handle.update();
    }
    async function handleSubmit(
      event: SubmitEvent & { currentTarget: HTMLFormElement },
      signal: AbortSignal,
    ) {
      event.preventDefault();
      if (isSubmitting) return;
      const form = event.currentTarget;
      imageRequired = false;
      isSubmitting = true;
      void handle.update();
      try {
        const croppedBlob = await getCroppedImage?.();
        if (signal.aborted) return;
        if (!croppedBlob && !editor.imageUrl) {
          imageRequired = true;
          return;
        }
        const formData = new FormData(form);
        if (croppedBlob) formData.set("imageFile", croppedBlob, "cropped.jpg");
        const response = await fetch(action, {
          method: "POST",
          body: formData,
          headers: { Accept: EDITOR_RESPONSE_MEDIA_TYPE },
          redirect: "error",
          signal,
        });
        if (signal.aborted) return;
        const data: unknown = await response.json();
        if (signal.aborted) return;
        const parsedResponse = parseSafe(drinkEditorResponseSchema, data);
        if (!parsedResponse.success) throw new Error("Unexpected Drink editor response");
        const result = parsedResponse.value;
        switch (result.kind) {
          case "navigate":
            if (result.document) window.location.assign(result.location);
            else await navigate(result.location);
            return;
          case "invalid":
            errors = [
              ...result.formErrors,
              ...Object.values(result.fieldErrors).flatMap((messages) => messages ?? []),
            ];
            break;
          case "notFound":
            errors = [result.message];
            break;
          default: {
            const unexpectedResponse: never = result;
            throw new Error(`Unexpected Drink editor response: ${String(unexpectedResponse)}`);
          }
        }
      } catch {
        if (!signal.aborted) errors = ["Unable to save drink. Please try again."];
      } finally {
        isSubmitting = false;
        if (!handle.signal.aborted) await handle.update();
      }
    }
    return () => {
      return (
        <form
          method="post"
          action={action}
          encType="multipart/form-data"
          mix={on<HTMLFormElement, "submit">("submit", handleSubmit)}
          className="space-y-6"
        >
          {errors && errors.length > 0 ? (
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

          <div>
            <span className="block text-sm font-semibold tracking-wider text-zinc-500 uppercase">
              Status
            </span>
            <input type="hidden" name="status" value={statusValue} />
            <div className="mt-2 inline-flex divide-x divide-zinc-700 rounded-sm border border-zinc-700">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={statusValue === option.value}
                  mix={on("click", () => setStatusValue(option.value))}
                  className={classes(
                    "px-4 py-2 text-sm font-medium transition-colors",
                    statusValue === option.value
                      ? option.activeClass
                      : "bg-zinc-800 text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-amber-600 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : editor.mode === "edit"
                  ? "Update Drink"
                  : "Create Drink"}
            </button>
          </div>
        </form>
      );
    };
  },
);
