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
  type DrinkWriteNotice,
  type UpdateAdminDrinkResult,
} from "#/app/modules/drinks/drinks.ts";
import { parseCreateDrinkSubmission, parseUpdateDrinkSubmission } from "./submission.server.ts";
import { EDITOR_RESPONSE_MEDIA_TYPE, type DrinkEditorResponse } from "./editor-response.ts";
import { renderResponseError } from "#/app/web/error-pages/response-error.server.tsx";

type AdminDrinkWriteActionAdapterInput = {
  request: Request;
  session: Session;
  adminDrinksWriteService: AdminDrinksWriteService;
};

type AdminDrinkWriteActionData = {
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
};

type DrinkDraftParseResult =
  | { kind: "ready"; draft: DrinkDraft }
  | ({ kind: "invalid"; status: 400 } & AdminDrinkWriteActionData);

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

export async function createAdminDrinkActionAdapter(input: AdminDrinkWriteActionAdapterInput) {
  const submission = await parseCreateDrinkSubmission(input.request);

  if (submission.kind === "invalid") {
    return invalidActionData(submission);
  }

  const draftResult = parseDrinkDraft(submission.formData);
  if (draftResult.kind === "invalid") {
    return invalidActionData(draftResult);
  }

  const result = await input.adminDrinksWriteService.create({
    draft: draftResult.draft,
    imageBuffer: submission.imageUpload.buffer,
  });

  return translateCreateResult(result, input.session);
}

export async function deleteAdminDrinkActionAdapter(
  input: AdminDrinkWriteActionAdapterInput & { slug: string },
) {
  const result = await input.adminDrinksWriteService.delete({ slug: input.slug });

  return translateDeleteResult(result, input.session);
}

export async function updateAdminDrinkActionAdapter(
  input: AdminDrinkWriteActionAdapterInput & { slug: string },
) {
  const submission = await parseUpdateDrinkSubmission(input.request);

  if (submission.kind === "invalid") {
    return invalidActionData(submission);
  }

  const draftResult = parseDrinkDraft(submission.formData);
  if (draftResult.kind === "invalid") {
    return invalidActionData(draftResult);
  }

  const result = await input.adminDrinksWriteService.update({
    slug: input.slug,
    draft: draftResult.draft,
    imageBuffer: submission.imageUpload?.buffer,
  });

  return translateUpdateResult(result, input.session, input.request);
}

function translateCreateResult(result: CreateAdminDrinkResult, session: Session) {
  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast(session, resolveWriteToast("created", result.notices));

    case "fieldError":
      return invalidActionData(result);

    default:
      return assertNever(result);
  }
}

function translateUpdateResult(result: UpdateAdminDrinkResult, session: Session, request: Request) {
  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast(session, resolveWriteToast("updated", result.notices));

    case "fieldError":
      return invalidActionData(result);

    case "notFound":
      return drinkNotFoundResponse(request);

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

function invalidActionData(result: AdminDrinkWriteActionData & { status?: number }) {
  const data: DrinkEditorResponse = {
    kind: "invalid",
    fieldErrors: result.fieldErrors,
    formErrors: result.formErrors,
  };
  return Response.json(data, { status: result.status ?? 400 });
}

function redirectToAdminDrinksWithToast(session: Session, toast: ToastMessage): Response {
  session.flash("toast", toast);
  return redirect("/admin/drinks", { status: 303 });
}

function drinkNotFoundResponse(request?: Request): Response {
  if (request?.headers.get("Accept") !== EDITOR_RESPONSE_MEDIA_TYPE)
    return renderResponseError(404);
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
