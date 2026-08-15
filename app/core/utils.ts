import type { useMatches } from "react-router";
import { invariant } from "@epic-web/invariant";

/**
 * Gets loader data for an ancestor route from a route id and the `matches` array returned from the
 * `useMatches` function.
 */
// eslint-disable-next-line typescript/no-unnecessary-type-parameters
export function getLoaderDataForHandle<TLoaderData = unknown>(
  routeId: string,
  matches: ReturnType<typeof useMatches>,
): TLoaderData | undefined {
  const match = matches.find((uiMatch) => uiMatch.id === routeId);
  invariant(match, `No match found for route id "${routeId}"`);
  // eslint-disable-next-line typescript/no-unsafe-type-assertion
  return match.loaderData as TLoaderData;
}

// TODO: remove once requestIdleCallback is available in Safari
// https://caniuse.com/requestidlecallback
export function requestIdleCallbackShim(cb: () => void) {
  if (typeof requestIdleCallback === "function") {
    return requestIdleCallback(cb);
  }

  return setTimeout(cb, 1);
}

type FormErrorActionData = {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
};

export function getFormErrors(actionData: FormErrorActionData | undefined) {
  if (!actionData) {
    return undefined;
  }

  const fieldErrors = Object.values(actionData.fieldErrors ?? {}).flatMap((errors) => errors ?? []);
  const formErrors = actionData.formErrors ?? [];
  const allErrors = [...formErrors, ...fieldErrors];

  return allErrors.length > 0 ? allErrors : undefined;
}
