import { data, href } from "react-router";
import { z } from "zod";
import { redirectWithToast, type ToastMessage } from "#/app/core/toast.server";
import {
  drinkDraftSchema,
  SaveDrinkNoticeCodes,
  type AdminDrinkWriteSuccessResult,
  type AdminDrinksWriteService,
  type CreateAdminDrinkResult,
  type DeleteAdminDrinkResult,
  type DrinkDraft,
  type SaveDrinkNotice,
  type UpdateAdminDrinkResult,
} from "#/app/modules/drinks/drinks";
import { parseCreateDrinkSubmission, parseUpdateDrinkSubmission } from "./submission.server";

type AdminDrinkWriteActionAdapterInput = {
  request: Request;
  adminDrinksWriteService: AdminDrinksWriteService;
};

type AdminDrinkWriteActionData = {
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
};

type DrinkDraftParseResult =
  | { kind: "ready"; draft: DrinkDraft }
  | ({ kind: "invalid"; status: 400 } & AdminDrinkWriteActionData);

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

  return translateCreateResult(result);
}

export async function deleteAdminDrinkActionAdapter(
  input: AdminDrinkWriteActionAdapterInput & { slug: string },
) {
  const result = await input.adminDrinksWriteService.delete({ slug: input.slug });

  return translateDeleteResult(result);
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

  return translateUpdateResult(result);
}

function translateCreateResult(result: CreateAdminDrinkResult) {
  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast({ kind: "success", message: "Drink created!" });

    case "fieldError":
      return invalidActionData(result);

    default:
      return assertNever(result);
  }
}

function translateUpdateResult(result: UpdateAdminDrinkResult) {
  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast(resolveUpdateToast(result));

    case "fieldError":
      return invalidActionData(result);

    case "notFound":
      return throwDrinkNotFound();

    default:
      return assertNever(result);
  }
}

function translateDeleteResult(result: DeleteAdminDrinkResult) {
  switch (result.kind) {
    case "success":
      return redirectToAdminDrinksWithToast({ kind: "success", message: "Drink deleted!" });

    case "notFound":
      return throwDrinkNotFound();

    default:
      return assertNever(result);
  }
}

function parseDrinkDraft(formData: FormData): DrinkDraftParseResult {
  const rawValues = Object.fromEntries(formData);
  const result = drinkDraftSchema.safeParse(rawValues);

  if (result.success) {
    return { kind: "ready", draft: result.data };
  }

  const flattenedError = z.flattenError(result.error);

  return {
    kind: "invalid",
    fieldErrors: flattenedError.fieldErrors,
    formErrors: flattenedError.formErrors,
    status: 400,
  };
}

function invalidActionData(result: AdminDrinkWriteActionData & { status?: number }) {
  return data(
    {
      fieldErrors: result.fieldErrors,
      formErrors: result.formErrors,
    },
    { status: result.status ?? 400 },
  );
}

async function redirectToAdminDrinksWithToast(toast: ToastMessage): Promise<never> {
  throw await redirectWithToast(href("/admin/drinks"), toast);
}

function throwDrinkNotFound(): never {
  throw new Response("Drink not found", { status: 404 });
}

function resolveUpdateToast(result: AdminDrinkWriteSuccessResult): ToastMessage {
  const noticeToast = result.notices.map(resolveSaveDrinkNoticeToast).find(Boolean);

  return noticeToast ?? { kind: "success", message: "Drink updated!" };
}

function resolveSaveDrinkNoticeToast(notice: SaveDrinkNotice): ToastMessage | undefined {
  switch (notice.code) {
    case SaveDrinkNoticeCodes.oldImageCleanupFailed:
      return { kind: "warning", message: "Drink updated, but old image cleanup failed" };

    default:
      return assertNever(notice.code);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected Admin Drink Write Route Adapter value: ${String(value)}`);
}
