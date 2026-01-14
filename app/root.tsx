import * as React from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, type LinksFunction } from 'react-router';
import sourceSans3Latin300 from '@fontsource/source-sans-3/latin-300.css?url';
import sourceSans3Latin400 from '@fontsource/source-sans-3/latin-400.css?url';
import './styles/app.css';
import faviconIcoUrl from './assets/images/favicon.ico';
import icon32Url from './assets/images/icon-32x32.png';
import appleTouchIconUrl from './assets/images/apple-touch-icon.png';
import { backgroundImageStyles } from './styles/background-image';
import { Breadcrumbs } from './navigation/breadcrumbs';
import { appName, appThemeColor } from './core/config';
import { SkipNavLink } from './core/skip-nav-link';
import { Header } from './core/header';
import { Footer } from './core/footer';
import { securityHeaders } from './middleware/security-headers';
import { loggingMiddleware } from './middleware/logging';
import { getEnvVars } from './utils/env.server';
import type { AppRouteHandle } from './types';
import type { Route } from './+types/root';

const { COMMIT_SHA } = getEnvVars();

export const middleware: Route.MiddlewareFunction[] = [loggingMiddleware, securityHeaders];

export const handle: AppRouteHandle = {
  breadcrumb: () => ({ title: 'All Drinks' }),
};

export const links: LinksFunction = () => [
  {
    rel: 'preconnect',
    href: 'https://images.ctfassets.net/',
    crossOrigin: 'anonymous',
  },
  { rel: 'dns-prefetch', href: 'https://images.ctfassets.net/' },
  { rel: 'icon', sizes: 'any', href: faviconIcoUrl },
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: icon32Url },
  { rel: 'apple-touch-icon', sizes: '180x180', href: appleTouchIconUrl },
  { rel: 'manifest', href: '/manifest.webmanifest' },
  { rel: 'stylesheet', href: sourceSans3Latin300 },
  { rel: 'stylesheet', href: sourceSans3Latin400 },
];

export const shouldRevalidate = () => false;

export async function loader() {
  return { commit: COMMIT_SHA };
}

export default function App({ loaderData }: Route.ComponentProps) {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return (
    <html
      lang="en"
      className="m-0 min-h-screen bg-neutral-800 bg-cover bg-fixed bg-center bg-no-repeat p-0 leading-tight"
      data-commit={loaderData.commit}
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="application-name" content={appName} />
        <meta name="apple-mobile-web-app-title" content={appName} />
        <meta name="msapplication-TileColor" content={appThemeColor} />
        <meta name="theme-color" content={appThemeColor} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{ __html: backgroundImageStyles }} />
      </head>
      <body className="relative flex min-h-screen flex-col font-sans font-light">
        <SkipNavLink contentId="main" />
        <Header />
        <div className="flex flex-1 flex-col gap-6 py-4 sm:w-104 sm:gap-8 sm:self-center sm:py-8 lg:w-full lg:max-w-240 xl:max-w-7xl">
          <Breadcrumbs />
          <main id="main">
            <Outlet />
          </main>
        </div>
        <Footer />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
