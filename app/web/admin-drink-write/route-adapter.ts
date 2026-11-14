import { routes } from "#/app/routes.ts";
import type { AppContext } from "#/app/router.ts";
import { redirect } from "remix/response/redirect";
import type { Session } from "remix/session";
import { parseSafe, string } from "remix/data-schema";
import { assertNever } from "#/app/core/public/assert-never.ts";
import { flashToast, type ToastMessage } from "#/app/core/toast.ts";
import { getDb } from "#/app/db/client.ts";
import {
  createDrinksService,
  drinkDraftSchema,
  drinkEditorFieldNames,
  drinkStatusValues,
  newDrinkEditor,
  type DeleteAdminDrinkResult,
  type DrinkDraft,
  type DrinkEditor,
  type DrinkEditorValues,
  type DrinkWriteNoticeCode,
} from "#/app/modules/drinks/drinks.ts";
import type { SessionUser } from "#/app/modules/identity/identity.ts";
import { renderDrinkEditor } from "#/app/actions/admin/drinks/editor-page.tsx";
import { createDrinkWriteService } from "#/app/actions/admin/drinks/write-service.ts";
import { renderResponseError } from "#/app/web/error-pages/response-error.tsx";
import { parseDrinkSubmission, type DrinkImageUpload } from "./submission.ts";

type AdminDrinkContext = Pick<AppContext, "session" | "render">;

type AdminDrinkEditorContext = AdminDrinkContext &
  Pick<AppContext, "request"> & { auth: { identity: SessionUser } };

type DrinkSlugParams = { params: { slug: string } };

type DrinkEditorWrite = { kind: "create" } | { kind: "update"; slug: string };

/** Form text for each editor field the submission sent. */
type SubmittedEditorValues = Partial<Record<keyof DrinkEditorValues, string>>;

type SubmittedEditorForm = {
  values: SubmittedEditorValues;
  /** Messages for editor fields the submission did not send as text, in field order. */
  fieldErrors: string[];
  formData: FormData | undefined;
};

type WriteToastOperation = "created" | "updated" | "deleted";

const writeToastOperations = {
  create: "created",
  update: "updated",
} as const satisfies Record<DrinkEditorWrite["kind"], WriteToastOperation>;

export function createAdminDrinkActionAdapter(context: AdminDrinkEditorContext) {
  return submitDrinkEditor(context, { kind: "create" });
}

export function updateAdminDrinkActionAdapter(context: AdminDrinkEditorContext & DrinkSlugParams) {
  return submitDrinkEditor(context, { kind: "update", slug: context.params.slug });
}

export async function deleteAdminDrinkActionAdapter(context: AdminDrinkContext & DrinkSlugParams) {
  const result = await createDrinkWriteService().delete({ slug: context.params.slug });

  return translateDeleteResult(result, context);
}

async function submitDrinkEditor(
  context: AdminDrinkEditorContext,
  write: DrinkEditorWrite,
): Promise<Response> {
  const submission = await parseDrinkSubmission(context.request);
  const submittedForm = readSubmittedEditorForm(submission.formData);

  const rejectSubmission = (errors: string[]) =>
    renderSubmittedEditor(context, write, submittedForm, errors);

  if (submission.kind === "invalid") return rejectSubmission(submission.errors);
  const writeDraft = prepareDraftWrite(write, submission.imageUpload);

  if (!writeDraft) return rejectSubmission(["Image is required"]);
  const draftResult = parseDrinkDraft(submittedForm);

  if (draftResult.kind === "invalid") return rejectSubmission(draftResult.errors);
  const result = await writeDraft(draftResult.draft);

  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast(
        context.session,
        resolveWriteToast(writeToastOperations[write.kind], result.notices),
      );

    case "slugTaken":
      return rejectSubmission(["Slug already exists"]);

    case "notFound":
      return renderResponseError(context.render, 404);

    default:
      return assertNever(result);
  }
}

/** Returns the service call for a valid draft, or null when the write lacks a required image. */
function prepareDraftWrite(write: DrinkEditorWrite, imageUpload: DrinkImageUpload | undefined) {
  const adminDrinksWriteService = createDrinkWriteService();

  switch (write.kind) {
    case "create":
      if (!imageUpload) return null;

      return (draft: DrinkDraft) =>
        adminDrinksWriteService.create({ draft, imageBuffer: imageUpload.buffer });

    case "update":
      return (draft: DrinkDraft) =>
        adminDrinksWriteService.update({
          slug: write.slug,
          draft,
          imageBuffer: imageUpload?.buffer,
        });

    default:
      return assertNever(write);
  }
}

function translateDeleteResult(result: DeleteAdminDrinkResult, context: AdminDrinkContext) {
  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast(
        context.session,
        resolveWriteToast("deleted", result.notices),
      );

    case "notFound":
      return renderResponseError(context.render, 404);

    default:
      return assertNever(result);
  }
}

function readSubmittedEditorForm(formData: FormData | undefined): SubmittedEditorForm {
  const values: SubmittedEditorValues = {};
  const fieldErrors: string[] = [];

  for (const fieldName of drinkEditorFieldNames) {
    const fieldResult = parseSafe(string(), formData?.get(fieldName) ?? undefined);

    if (fieldResult.success) values[fieldName] = fieldResult.value;
    else fieldErrors.push(...fieldResult.issues.map((issue) => issue.message));
  }

  return { values, fieldErrors, formData };
}

/** Requires every editor field as text before validating the draft. */
function parseDrinkDraft(
  submittedForm: SubmittedEditorForm,
): { kind: "valid"; draft: DrinkDraft } | { kind: "invalid"; errors: string[] } {
  if (submittedForm.fieldErrors.length > 0)
    return { kind: "invalid", errors: submittedForm.fieldErrors };
  const draftResult = parseSafe(drinkDraftSchema, submittedForm.values);

  return draftResult.success
    ? { kind: "valid", draft: draftResult.value }
    : { kind: "invalid", errors: draftResult.issues.map((issue) => issue.message) };
}

async function renderSubmittedEditor(
  context: AdminDrinkEditorContext,
  write: DrinkEditorWrite,
  submittedForm: SubmittedEditorForm,
  errors: string[],
) {
  const editorPage = await loadEditorPage(write);

  if (!editorPage) return renderResponseError(context.render, 404);
  const { values, formData } = submittedForm;

  const status =
    drinkStatusValues.find((statusValue) => statusValue === values.status) ??
    editorPage.editor.initialValues.status;

  const editor = {
    ...editorPage.editor,
    initialValues: { ...editorPage.editor.initialValues, ...values, status },
  };

  // The upload handler stores a sent file's name. Enhanced editors keep the selected image.
  const image = parseSafe(string(), formData?.get("imageFile"));

  const imageNotice =
    image.success && image.value && context.request.headers.get("X-Remix-Frame") !== "true"
      ? ["Select the image again before saving."]
      : [];

  return renderDrinkEditor(context, {
    editor,
    user: context.auth.identity,
    action: editorPage.action,
    errors: [...errors, ...imageNotice],
  });
}

async function loadEditorPage(
  write: DrinkEditorWrite,
): Promise<{ editor: DrinkEditor; action: string } | null> {
  switch (write.kind) {
    case "create":
      return { editor: newDrinkEditor, action: routes.admin.drinks.new.action.href() };

    case "update": {
      const drinksService = createDrinksService({ db: getDb() });
      const editor = await drinksService.findDrinkEditorBySlug(write.slug);

      return editor
        ? { editor, action: routes.admin.drinks.edit.action.href({ slug: write.slug }) }
        : null;
    }

    default:
      return assertNever(write);
  }
}

function redirectToAdminDrinksWithToast(session: Session, toast: ToastMessage): Response {
  flashToast(session, toast);

  return redirect(routes.admin.drinks.index.href(), { status: 303 });
}

function resolveWriteToast(
  operation: WriteToastOperation,
  notices: DrinkWriteNoticeCode[],
): ToastMessage {
  if (notices.length === 0) return { kind: "success", message: `Drink ${operation}!` };

  return {
    kind: "warning",
    message: `Drink ${operation}, but ${notices.map(resolveWriteNoticeMessage).join(" and ")}`,
  };
}

function resolveWriteNoticeMessage(notice: DrinkWriteNoticeCode): string {
  switch (notice) {
    case "oldImageCleanupFailed":
      return "old image cleanup failed";

    case "cacheRefreshFailed":
      return "cache refresh failed";

    default:
      return assertNever(notice);
  }
}
