import type { HeadersFunction } from '@remix-run/node';
import { Outlet } from '@remix-run/react';

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

export const headers: HeadersFunction = ({ errorHeaders }) => {
  if (errorHeaders?.has('Cache-Control')) {
    const thrownCacheControl = errorHeaders.get('Cache-Control');
    if (typeof thrownCacheControl === 'string') {
      return { 'Cache-Control': thrownCacheControl };
    }
  }

  // TODO: TS demands whatever we return is always the same shape, but we don't really want to set
  // the Cache-Control header if we didn't get one from a thrown response (the leaf routes will set
  // their own). I guess we'll set it to an empty string? ¯\_(ツ)_/¯
  return { 'Cache-Control': '' };
};

export default function AppLayout() {
  return <Outlet />;
}

export { ErrorBoundary } from '~/core/errors';
