import type { useMatches } from 'react-router';
import { invariant } from '@epic-web/invariant';

// TODO: is there a better way to type this? LoaderFunction from react-router ain't it.
type ReactRouterLoaderFunction = (...args: any[]) => Promise<any>;

/**
 * Gets loader data for an ancestor route from a route id and the `matches` array returned from the
 * `useMatches` function.
 */
export function getLoaderDataForHandle<TLoaderFn extends ReactRouterLoaderFunction>(
  routeId: string,
  matches: ReturnType<typeof useMatches>,
): Awaited<ReturnType<TLoaderFn>> | undefined {
  const match = matches.find((uiMatch) => uiMatch.id === routeId);
  invariant(match, `No match found for route id "${routeId}"`);
  return match.data as Awaited<ReturnType<TLoaderFn>>;
}
