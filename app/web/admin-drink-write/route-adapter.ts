import { routes } from "#/app/routes.ts";
import { redirect } from "remix/response/redirect";
import type { Session } from "remix/session";
import { parseSafe, string } from "remix/data-schema";
import { field, object } from "remix/data-schema/form-data";
import type { ToastMessage } from "#/app/core/toast.ts";
import {
  drinkDraftSchema,
  DrinkWriteNoticeCodes,
  type AdminDrinksWriteService,
  type AdminDrinkWriteFieldErrorResult,
  type CreateAdminDrinkResult,
  type DeleteAdminDrinkResult,
  type DrinkEditor,
  type DrinkWriteNotice,
  type UpdateAdminDrinkResult,
} from "#/app/modules/drinks/drinks.ts";
import { parseDrinkSubmission } from "./submission.ts";
import { renderResponseError } from "#/app/web/error-pages/response-error.tsx";

type AdminDrinkWriteActionAdapterInput = {
  request: Request;
  session: Session;
  adminDrinksWriteService: AdminDrinksWriteService;
};

type AdminDrinkEditorAdapterInput = AdminDrinkWriteActionAdapterInput & {
  invalidEditor: {
    load: () => Promise<DrinkEditor | null>;
    render: (editor: DrinkEditor, errors: string[]) => Promise<Response>;
  };
};

const drinkFormSchema = object({
  title: field(string()),
  slug: field(string()),
  ingredients: field(string()),
  calories: field(string()),
  tags: field(string()),
  notes: field(string()),
  rank: field(string()),
  status: field(string()),
});

export async function createAdminDrinkActionAdapter(input: AdminDrinkEditorAdapterInput) {
  const submission = await parseDrinkSubmission(input.request);

  if (submission.kind === "invalid") {
    return invalidEditorResponse(input, submission.errors, submission.formData);
  }

  if (!submission.imageUpload) {
    return invalidEditorResponse(input, ["Image is required"], submission.formData);
  }

  const draftResult = parseDrinkDraft(submission.formData);

  if (!draftResult.success) {
    return invalidEditorResponse(
      input,
      draftResult.issues.map((issue) => issue.message),
      submission.formData,
    );
  }

  const result = await input.adminDrinksWriteService.create({
    draft: draftResult.value,
    imageBuffer: submission.imageUpload.buffer,
  });

  return translateCreateResult(result, input, submission.formData);
}

export async function deleteAdminDrinkActionAdapter(
  input: AdminDrinkWriteActionAdapterInput & { slug: string },
) {
  const result = await input.adminDrinksWriteService.delete({ slug: input.slug });

  return translateDeleteResult(result, input.session);
}

export async function updateAdminDrinkActionAdapter(
  input: AdminDrinkEditorAdapterInput & { slug: string },
) {
  const submission = await parseDrinkSubmission(input.request);

  if (submission.kind === "invalid") {
    return invalidEditorResponse(input, submission.errors, submission.formData);
  }

  const draftResult = parseDrinkDraft(submission.formData);

  if (!draftResult.success) {
    return invalidEditorResponse(
      input,
      draftResult.issues.map((issue) => issue.message),
      submission.formData,
    );
  }

  const result = await input.adminDrinksWriteService.update({
    slug: input.slug,
    draft: draftResult.value,
    imageBuffer: submission.imageUpload?.buffer,
  });

  return translateUpdateResult(result, input, submission.formData);
}

function translateCreateResult(
  result: CreateAdminDrinkResult,
  input: AdminDrinkEditorAdapterInput,
  formData: FormData,
) {
  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast(
        input.session,
        resolveWriteToast("created", result.notices),
      );

    case "fieldError":
      return invalidEditorResponse(input, fieldErrorMessages(result), formData);

    default:
      return assertNever(result);
  }
}

function translateUpdateResult(
  result: UpdateAdminDrinkResult,
  input: AdminDrinkEditorAdapterInput,
  formData: FormData,
) {
  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast(
        input.session,
        resolveWriteToast("updated", result.notices),
      );

    case "fieldError":
      return invalidEditorResponse(input, fieldErrorMessages(result), formData);

    case "notFound":
      return renderResponseError(404);

    default:
      return assertNever(result);
  }
}

function translateDeleteResult(result: DeleteAdminDrinkResult, session: Session) {
  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast(session, resolveWriteToast("deleted", result.notices));

    case "notFound":
      return renderResponseError(404);

    default:
      return assertNever(result);
  }
}

function parseDrinkDraft(formData: FormData) {
  const formResult = parseSafe(drinkFormSchema, formData);

  return formResult.success ? parseSafe(drinkDraftSchema, formResult.value) : formResult;
}

function fieldErrorMessages(result: AdminDrinkWriteFieldErrorResult): string[] {
  return [
    ...result.formErrors,
    ...Object.values(result.fieldErrors).flatMap((messages) => messages ?? []),
  ];
}

async function invalidEditorResponse(
  input: AdminDrinkEditorAdapterInput,
  errors: string[],
  formData?: FormData,
) {
  const editor = await input.invalidEditor.load();

  if (!editor) return renderResponseError(404);
  const initialValues = { ...editor.initialValues };

  for (const name of [
    "title",
    "slug",
    "ingredients",
    "calories",
    "tags",
    "notes",
    "rank",
  ] as const) {
    const value = parseSafe(string(), formData?.get(name));

    if (value.success) initialValues[name] = value.value;
  }

  const status = formData?.get("status");

  if (status === "published" || status === "unpublished") initialValues.status = status;
  // The upload handler stores a sent file's name. Enhanced editors keep the selected image.
  const image = parseSafe(string(), formData?.get("imageFile"));

  const imageNotice =
    image.success && image.value && input.request.headers.get("X-Remix-Frame") !== "true"
      ? ["Select the image again before saving."]
      : [];

  return input.invalidEditor.render({ ...editor, initialValues }, [...errors, ...imageNotice]);
}

function redirectToAdminDrinksWithToast(session: Session, toast: ToastMessage): Response {
  session.flash("toast", toast);

  return redirect(routes.admin.drinks.index.href(), { status: 303 });
}

function resolveWriteToast(
  operation: "created" | "updated" | "deleted",
  notices: DrinkWriteNotice[],
): ToastMessage {
  if (notices.length === 0) return { kind: "success", message: `Drink ${operation}!` };

  return {
    kind: "warning",
    message: `Drink ${operation}, but ${notices.map(resolveWriteNoticeMessage).join(" and ")}`,
  };
}

function resolveWriteNoticeMessage(notice: DrinkWriteNotice): string {
  switch (notice.code) {
    case DrinkWriteNoticeCodes.oldImageCleanupFailed:
      return "old image cleanup failed";

    case DrinkWriteNoticeCodes.cacheRefreshFailed:
      return "cache refresh failed";

    default:
      return assertNever(notice.code);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected Admin Drink Write Route Adapter value: ${String(value)}`);
}
