import { data, redirect } from "react-router";
import { z, type ZodType } from "zod";
import { DomainError, FieldDomainError, FormDomainError } from "./errors";
import { dataWithToast, redirectWithToast, type ToastMessage } from "./toast.server";

export type ActionData = {
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
  actionIntent?: string;
};

export type ToastConfig =
  | { successMessage: string; errorMessage?: string | true }
  | { successMessage?: string; errorMessage: string | true };

export type IntentToast<TResult = unknown> =
  | ToastConfig
  | ((operationResult: TResult | DomainError) => ToastMessage | undefined);

const INTENT_BRAND: unique symbol = Symbol();

type IntentDef = {
  schema?: ZodType;
  operation: (...args: unknown[]) => Promise<unknown>;
  redirectTo?: string | ((result: unknown) => string);
  toast?: IntentToast<unknown>;
};

export type Intent = IntentDef & { [INTENT_BRAND]: true };

/**
 * Defines a single action "intent" for `routeAction()`.
 *
 * Think of this as the per-submit configuration object that tells the action pipeline:
 * - how to validate the form (`schema`)
 * - what business operation to run (`operation`)
 * - whether success should redirect somewhere (`redirectTo`)
 * - which success/error toast to show (`toast`)
 *
 * Common patterns:
 * - Use `schema + operation` for normal form submissions.
 * - Use only `operation` for button actions that don't need parsed form fields.
 * - Add `redirectTo` when success should navigate away.
 * - Omit `redirectTo` for fetcher or same-page submissions that should receive an `ActionData`
 *   payload.
 *
 * `toast` may be a simple config object or a function. When you provide a function, it receives
 * either the successful operation result or a caught domain error, so you can build dynamic toast
 * messages from either case.
 *
 * @example
 * const createDrinkIntent = intent({
 *   schema: drinkDraftSchema,
 *   operation: (draft) => drinksService.createDrink({
 *     draft,
 *     imageBuffer,
 *   }),
 *   redirectTo: href("/admin/drinks"),
 *   toast: { successMessage: "Drink created!" },
 * });
 *
 * @example
 * const deleteDrinkIntent = intent({
 *   operation: () => drinksService.deleteDrink({ slug: params.slug }),
 *   redirectTo: href("/admin/drinks"),
 *   toast: { successMessage: "Drink deleted!" },
 * });
 */
export function intent<TInput, TResult>(config: {
  schema: ZodType<TInput>;
  operation: (data: TInput) => Promise<TResult>;
  redirectTo: string | ((result: TResult) => string);
  toast?: IntentToast<TResult>;
}): Intent;
export function intent<TInput>(config: {
  schema: ZodType<TInput>;
  operation: (data: TInput) => Promise<unknown>;
  toast?: IntentToast<unknown>;
}): Intent;
export function intent<TResult>(config: {
  operation: () => Promise<TResult>;
  redirectTo: string | ((result: TResult) => string);
  toast?: IntentToast<TResult>;
}): Intent;
export function intent(config: {
  operation: () => Promise<unknown>;
  toast?: IntentToast<unknown>;
}): Intent;
export function intent(config: IntentDef): Intent {
  const result: Intent = { ...config, [INTENT_BRAND]: true as const };
  return result;
}

function isBrandedIntent(value: unknown): value is Intent {
  return typeof value === "object" && value !== null && INTENT_BRAND in value;
}

/**
 * Standard action pipeline for React Router form submissions.
 *
 * Pass either:
 * - a single `intent(...)` for routes with one action, or
 * - a record of `intent(...)` values for multi-action forms keyed by the submitted `intent`
 *   button value.
 *
 * What this does for you:
 * - reads `request.formData()`
 * - picks the matching intent (for multi-intent actions)
 * - validates the form with the intent's Zod schema, if present
 * - calls the intent `operation()` with the parsed form value
 * - converts `FieldDomainError` / `FormDomainError` into field/form errors
 * - adds success/error toasts when configured
 * - throws a redirect when `redirectTo` is configured, otherwise returns an `ActionData` payload
 * - includes `actionIntent` on multi-intent responses so the UI knows which action ran
 *
 * Use `redirectTo` for normal form posts that should navigate away after success. Omit it for
 * fetcher forms or same-page submissions where the caller should receive the submission result.
 *
 * Routes may still do pre-validation work before calling `routeAction`, such as multipart image
 * parsing. In that case, return the preparation failure directly and only pass the ready intent to
 * `routeAction`.
 *
 * @example
 * // Single-intent action
 * const submission = await parseCreateDrinkSubmission(request);
 * if (submission.kind === "invalid") return data(submission, { status: submission.status });
 * return routeAction(request, createDrinkIntent, { formData: submission.formData });
 *
 * @example
 * // Multi-intent action: submit with <button name="intent" value="delete" />
 * return routeAction(request, {
 *   update: intent({
 *     schema: drinkDraftSchema,
 *     operation: (draft) => drinksService.updateDrink({ slug: params.slug, draft }),
 *     redirectTo: href("/admin/drinks"),
 *     toast: { successMessage: "Drink updated!" },
 *   }),
 *   delete: intent({
 *     operation: () => drinksService.deleteDrink({ slug: params.slug }),
 *     redirectTo: href("/admin/drinks"),
 *     toast: { successMessage: "Drink deleted!" },
 *   }),
 * });
 */
export async function routeAction(
  request: Request,
  intentOrMap: Intent | Record<string, Intent>,
  options: { formData?: FormData } = {},
) {
  const formData = options.formData ?? (await readFormData(request));

  let intentKey: string | undefined;
  let intentDef: IntentDef;
  let isMultiIntent = false;

  if (isBrandedIntent(intentOrMap)) {
    intentDef = intentOrMap;
  } else {
    isMultiIntent = true;
    const formIntent = String(formData.get("intent") ?? "");
    const selectedIntent = intentOrMap[formIntent];

    if (!selectedIntent) {
      return data(
        {
          fieldErrors: {},
          formErrors: [`Invalid intent "${formIntent}"`],
        } satisfies ActionData,
        { status: 400 },
      );
    }

    intentKey = formIntent;
    intentDef = selectedIntent;
  }

  async function errorResult(
    body: Pick<ActionData, "fieldErrors" | "formErrors">,
    status: number,
    errorToast?: ToastMessage,
  ) {
    const payload: ActionData = {
      fieldErrors: body.fieldErrors,
      formErrors: body.formErrors,
      ...(isMultiIntent ? { actionIntent: intentKey } : {}),
    };

    if (errorToast) {
      return dataWithToast(payload, errorToast, { status });
    }

    return data(payload, { status });
  }

  let operationArgs: unknown[];

  if (intentDef.schema) {
    const submission = parseSubmission(formData, intentDef.schema);
    if (!submission.success) {
      return errorResult(
        {
          fieldErrors: submission.fieldErrors,
          formErrors: submission.formErrors,
        },
        400,
      );
    }

    operationArgs = [submission.data];
  } else {
    operationArgs = [];
  }

  try {
    const operationResult = await intentDef.operation(...operationArgs);
    const successToast = resolveSuccessToast(intentDef.toast, operationResult);

    if (intentDef.redirectTo) {
      const url =
        typeof intentDef.redirectTo === "function"
          ? intentDef.redirectTo(operationResult)
          : intentDef.redirectTo;

      if (successToast) {
        throw await redirectWithToast(url, successToast);
      }

      throw redirect(url);
    }

    const payload: ActionData = {
      fieldErrors: {},
      formErrors: [],
      ...(isMultiIntent ? { actionIntent: intentKey } : {}),
    };

    if (successToast) {
      return dataWithToast(payload, successToast);
    }

    return data(payload);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    if (error instanceof FieldDomainError) {
      const errorToast = resolveErrorToast(intentDef.toast, error);
      return errorResult(
        {
          fieldErrors: {
            [error.field]: [error.message],
          },
          formErrors: [],
        },
        400,
        errorToast,
      );
    }

    if (error instanceof FormDomainError) {
      const errorToast = resolveErrorToast(intentDef.toast, error);
      return errorResult(
        {
          fieldErrors: {},
          formErrors: [error.message],
        },
        400,
        errorToast,
      );
    }

    throw error;
  }
}

function parseSubmission<TInput>(formData: FormData, schema: ZodType<TInput>) {
  const rawValues = Object.fromEntries(formData);
  const result = schema.safeParse(rawValues);

  if (result.success) {
    return {
      success: true as const,
      data: result.data,
    };
  }

  const flattenedError = z.flattenError(result.error);

  return {
    success: false as const,
    fieldErrors: flattenedError.fieldErrors,
    formErrors: flattenedError.formErrors,
  };
}

function resolveSuccessToast(
  toast: IntentToast<unknown> | undefined,
  operationResult: unknown,
): ToastMessage | undefined {
  if (!toast) return undefined;
  if (typeof toast === "function") return toast(operationResult) ?? undefined;
  if (toast.successMessage) return { kind: "success", message: toast.successMessage };
  return undefined;
}

function resolveErrorToast(
  toast: IntentToast<unknown> | undefined,
  error: DomainError,
): ToastMessage | undefined {
  if (!toast) return undefined;
  if (typeof toast === "function") return toast(error) ?? undefined;
  const cfg = toast.errorMessage;
  if (!cfg) return undefined;
  return { kind: "error", message: cfg === true ? error.message : cfg };
}

async function readFormData(request: Request) {
  const contentType = request.headers.get("Content-Type");

  if (!contentType) {
    return new FormData();
  }

  return request.formData();
}
