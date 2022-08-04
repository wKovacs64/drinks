import { Outlet } from '@remix-run/react';

// Currently, the only purpose for this pathless layout route is to render any
// error fallbacks (CatchBoundary and ErrorBoundary) that are thrown within the
// app (anything below this pathless route). This happens here instead of in the
// root route so the error fallbacks get rendered within the app layout. In the
// event something in the app layout itself (e.g., the Header component) throws
// an error, these will not catch it and it will be handled by the root route
// (or Remix itself if there are no boundaries defined in the root route).

export default function AppLayout() {
  return <Outlet />;
}

export { CatchBoundary, ErrorBoundary } from '~/core/errors';
