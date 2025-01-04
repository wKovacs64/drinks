import { Outlet } from 'react-router';
import type { Route } from './+types/_app';

// Currently, the only purpose for this pathless layout route is to render an error fallback for any
// errors that are thrown within the app (anything below this pathless route). This happens here
// instead of in the root route so the error fallback gets rendered within the root layout. In the
// event something in the root layout itself (e.g., the Header component) throws an error, it will
// not be caught here and it will be handled by the root route (or Remix itself if there are no
// boundaries defined in the root route).
//
// The headers function is necessary to handle the headers that might be thrown from a child route
// (such as a 404). Thrown responses are handled by the closest ErrorBoundary (which is likely here)
// and their headers don't get automatically included in the response, so we have to do it
// ourselves.

export function headers({ errorHeaders }: Route.HeadersArgs) {
  return {
    ...(errorHeaders ? Object.fromEntries(errorHeaders) : {}),
  };
}

export default function AppLayout() {
  return <Outlet />;
}

export { ErrorBoundary } from '~/core/errors';
