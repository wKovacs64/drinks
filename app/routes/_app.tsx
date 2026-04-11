import { Outlet } from "react-router";
import { backgroundImageStyles } from "#/app/styles/background-image";
import { Breadcrumbs } from "#/app/ui/navigation/breadcrumbs";
import { SkipNavLink } from "#/app/ui/core/skip-nav-link";
import { Header } from "#/app/ui/core/header";
import { Footer } from "#/app/ui/core/footer";
import { optionalUser } from "#/app/modules/identity/identity.server";
import type { AppRouteHandle } from "#/app/types";
import type { Route } from "./+types/_app";

export const middleware = [optionalUser];

// This pathless layout route wraps all public-facing routes with the site chrome (Header,
// Breadcrumbs, Footer, background image, etc.). It also renders an error fallback for any errors
// thrown within the app (anything below this pathless route). This happens here instead of in the
// root route so the error fallback gets rendered within the root layout. In the event something in
// the root layout itself throws an error, it will be handled by the root route.
//
// The headers function is necessary to handle the headers that might be thrown from a child route
// (such as a 404). Thrown responses are handled by the closest ErrorBoundary (which is likely here)
// and their headers don't get automatically included in the response, so we have to do it
// ourselves.

export const handle: AppRouteHandle = {
  breadcrumb: () => ({ title: "All Drinks" }),
};

export function headers({ errorHeaders }: Route.HeadersArgs) {
  return {
    ...(errorHeaders ? Object.fromEntries(errorHeaders) : {}),
  };
}

export default function AppLayout() {
  return (
    <div className="bg-app-image flex min-h-screen flex-col bg-neutral-800 bg-cover bg-fixed bg-center bg-no-repeat">
      <style dangerouslySetInnerHTML={{ __html: backgroundImageStyles }} />
      <SkipNavLink contentId="main" />
      <Header />
      <div className="flex flex-1 flex-col gap-6 py-4 sm:w-104 sm:gap-8 sm:self-center sm:py-8 lg:w-full lg:max-w-240 xl:max-w-7xl">
        <Breadcrumbs />
        <main id="main">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}

export { ErrorBoundary } from "#/app/ui/core/errors";
