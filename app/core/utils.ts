import type { useMatches } from 'react-router';
import { invariant } from '@epic-web/invariant';

/**
 * Gets loader data for an ancestor route from a route id and the `matches` array returned from the
 * `useMatches` function.
 */
export function getLoaderDataForHandle<TLoaderData = unknown>(
  routeId: string,
  matches: ReturnType<typeof useMatches>,
): TLoaderData | undefined {
  const match = matches.find((uiMatch) => uiMatch.id === routeId);
  invariant(match, `No match found for route id "${routeId}"`);
  return match.loaderData as TLoaderData;
}
