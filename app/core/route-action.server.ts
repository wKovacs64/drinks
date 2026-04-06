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

/** Static copy + optional error toast, or a function of the operation result (success path only). */
export type IntentToast<TResult = unknown> = ToastConfig | ((result: TResult) => ToastMessage);

const INTENT_BRAND: unique symbol = Symbol();

type IntentDef = {
  schema?: ZodType;
  operation: (...args: unknown[]) => Promise<unknown>;
  redirectTo?: string | ((result: unknown) => string);
  toast?: IntentToast<unknown>;
};

export type Intent = IntentDef & { [INTENT_BRAND]: true };

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

export async function routeAction(request: Request, intentOrMap: Intent | Record<string, Intent>) {
  const formData = await readFormData(request);

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
    errorMessage?: string,
  ) {
    const payload: ActionData = {
      fieldErrors: body.fieldErrors,
      formErrors: body.formErrors,
      ...(isMultiIntent ? { actionIntent: intentKey } : {}),
    };

    if (errorMessage) {
      return dataWithToast(payload, { kind: "error", message: errorMessage }, { status });
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
      return errorResult(
        {
          fieldErrors: {
            [error.field]: [error.message],
          },
          formErrors: [],
        },
        400,
        resolveErrorMessage(intentDef, error),
      );
    }

    if (error instanceof FormDomainError) {
      return errorResult(
        {
          fieldErrors: {},
          formErrors: [error.message],
        },
        400,
        resolveErrorMessage(intentDef, error),
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

function toastConfigForErrors(toast: IntentToast<unknown> | undefined): ToastConfig | undefined {
  if (!toast || typeof toast === "function") {
    return undefined;
  }
  return toast;
}

function resolveSuccessToast(
  toast: IntentToast<unknown> | undefined,
  operationResult: unknown,
): ToastMessage | undefined {
  if (!toast) {
    return undefined;
  }
  if (typeof toast === "function") {
    return toast(operationResult);
  }
  if ("successMessage" in toast && toast.successMessage) {
    return { kind: "success", message: toast.successMessage };
  }
  return undefined;
}

function resolveErrorMessage(intentDef: IntentDef, error: DomainError) {
  const config = toastConfigForErrors(intentDef.toast)?.errorMessage;
  if (!config) {
    return undefined;
  }

  return config === true ? error.message : config;
}

async function readFormData(request: Request) {
  const contentType = request.headers.get("Content-Type");

  if (!contentType) {
    return new FormData();
  }

  return request.formData();
}
