import * as React from 'react';
import {
  useLocation,
  useMatches,
  useSearchParams,
  type UIMatch,
} from '@remix-run/react';
import type { SerializeFrom } from '@remix-run/node';
import Nav from './nav';
import NavLink from './nav-link';
import NavDivider from './nav-divider';

export default function Breadcrumbs() {
  const matches = useMatches();
  const { pathname: currentPathname } = useLocation();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q');
  const isSearching = currentPathname === '/search' && q;
  const matchesWithBreadcrumbData = matches.filter(hasHandleWithBreadcrumb);

  return (
    <Nav>
      <ul>
        {matchesWithBreadcrumbData.map((match, matchIndex) => {
          const { title } = match.handle.breadcrumb(matches);
          const isActive = !isSearching && match.pathname === currentPathname;

          return (
            <li key={match.id} className="inline">
              {isActive ? (
                title
              ) : (
                <NavLink to={match.pathname}>{title}</NavLink>
              )}
              {matchIndex < matchesWithBreadcrumbData.length - 1 ? (
                <NavDivider />
              ) : null}
            </li>
          );
        })}
        {isSearching ? (
          <>
            <NavDivider />
            <span>&quot;{q}&quot;</span>
          </>
        ) : null}
      </ul>
    </Nav>
  );
}

export type BreadcrumbHandle = {
  breadcrumb: (matches: ReturnType<typeof useMatches>) => {
    title: string | React.ReactElement;
  };
};

function hasHandleWithBreadcrumb(
  match: UIMatch,
): match is UIMatch<unknown, BreadcrumbHandle> {
  return (
    match.handle !== null &&
    typeof match.handle === 'object' &&
    'breadcrumb' in match.handle &&
    typeof match.handle.breadcrumb === 'function'
  );
}

/**
 * Gets loader data for an ancestor route from a route id and the `matches`
 * object returned from the `useMatches` function.
 */
export function getLoaderDataForHandle<Loader>(
  routeId: string,
  matches: ReturnType<typeof useMatches>,
) {
  const match = matches.find((match) => match.id === routeId);
  if (!match) throw new Error(`No match found for route id "${routeId}"`);
  return match.data as SerializeFrom<Loader>;
}
