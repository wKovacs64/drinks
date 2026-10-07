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
  type CreateAdminDrinkResult,
  type DeleteAdminDrinkResult,
  type DrinkDraft,
  type DrinkEditor,
  type DrinkWriteNotice,
  type UpdateAdminDrinkResult,
} from "#/app/modules/drinks/drinks.ts";
import { parseCreateDrinkSubmission, parseUpdateDrinkSubmission } from "./submission.ts";
import type { DrinkEditorResponse } from "#/app/web/admin-drink-write/public/editor-response.ts";
import { acceptsEditorResponse } from "./editor-request.ts";
import { renderResponseError } from "#/app/web/error-pages/response-error.tsx";

type AdminDrinkWriteActionAdapterInput = {
  request: Request;
  session: Session;
  adminDrinksWriteService: AdminDrinksWriteService;
};

type InvalidDrinkEditor = {
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
};

type AdminDrinkEditorAdapterInput = AdminDrinkWriteActionAdapterInput & {
  invalidEditor: {
    load: () => Promise<DrinkEditor | null>;
    render: (editor: DrinkEditor, errors: string[]) => Promise<Response>;
  };
};

type DrinkDraftParseResult =
  | { kind: "ready"; draft: DrinkDraft }
  | ({ kind: "invalid"; status: 400 } & InvalidDrinkEditor);

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
  const submission = await parseCreateDrinkSubmission(input.request);

  if (submission.kind === "invalid") {
    return invalidEditorResponse(input, submission, submission.formData);
  }

  const draftResult = parseDrinkDraft(submission.formData);
  if (draftResult.kind === "invalid") {
    return invalidEditorResponse(input, draftResult, submission.formData);
  }

  const result = await input.adminDrinksWriteService.create({
    draft: draftResult.draft,
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
  const submission = await parseUpdateDrinkSubmission(input.request);

  if (submission.kind === "invalid") {
    return invalidEditorResponse(input, submission, submission.formData);
  }

  const draftResult = parseDrinkDraft(submission.formData);
  if (draftResult.kind === "invalid") {
    return invalidEditorResponse(input, draftResult, submission.formData);
  }

  const result = await input.adminDrinksWriteService.update({
    slug: input.slug,
    draft: draftResult.draft,
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
      return invalidEditorResponse(input, result, formData);

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
      return invalidEditorResponse(input, result, formData);

    case "notFound":
      return drinkNotFoundResponse(input.request);

    default:
      return assertNever(result);
  }
}

function translateDeleteResult(result: DeleteAdminDrinkResult, session: Session) {
  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast(session, resolveWriteToast("deleted", result.notices));

    case "notFound":
      return drinkNotFoundResponse();

    default:
      return assertNever(result);
  }
}

function parseDrinkDraft(formData: FormData): DrinkDraftParseResult {
  const formResult = parseSafe(drinkFormSchema, formData);
  const result = formResult.success ? parseSafe(drinkDraftSchema, formResult.value) : formResult;

  if (result.success) {
    return { kind: "ready", draft: result.value };
  }

  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];
  for (const issue of result.issues) {
    const fieldName = issue.path?.[0];
    if (typeof fieldName === "string") (fieldErrors[fieldName] ??= []).push(issue.message);
    else formErrors.push(issue.message);
  }

  return {
    kind: "invalid",
    fieldErrors: fieldErrors,
    formErrors: formErrors,
    status: 400,
  };
}

async function invalidEditorResponse(
  input: AdminDrinkEditorAdapterInput,
  result: InvalidDrinkEditor,
  formData?: FormData,
) {
  const data: DrinkEditorResponse = {
    kind: "invalid",
    fieldErrors: result.fieldErrors,
    formErrors: result.formErrors,
  };
  if (acceptsEditorResponse(input.request)) return Response.json(data, { status: 400 });

  const editor = await input.invalidEditor.load();
  if (!editor) return drinkNotFoundResponse(input.request);
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
    const value = formData?.get(name);
    if (typeof value === "string") initialValues[name] = value;
  }
  const status = formData?.get("status");
  if (status === "published" || status === "unpublished") initialValues.status = status;
  const errors = [
    ...result.formErrors,
    ...Object.values(result.fieldErrors).flatMap((messages) => messages ?? []),
  ];
  const image = formData?.get("imageFile");
  if (typeof image === "string" && image) errors.push("Select the image again before saving.");
  return input.invalidEditor.render({ ...editor, initialValues }, errors);
}

function redirectToAdminDrinksWithToast(session: Session, toast: ToastMessage): Response {
  session.flash("toast", toast);
  return redirect(routes.admin.drinks.index.href(), { status: 303 });
}

function drinkNotFoundResponse(request?: Request): Response {
  if (!request || !acceptsEditorResponse(request)) return renderResponseError(404);
  const data: DrinkEditorResponse = { kind: "notFound", message: "Drink not found" };
  return Response.json(data, { status: 404 });
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
