import * as React from 'react';
import { cssBundleHref } from '@remix-run/css-bundle';
import { json, type LinksFunction, type MetaFunction } from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useMatches,
} from '@remix-run/react';
import sourceSans3Latin300 from '@fontsource/source-sans-3/latin-300.css';
import sourceSans3Latin400 from '@fontsource/source-sans-3/latin-400.css';
// @ts-ignore
import faviconIcoUrl from '../public/favicon.ico';
import icon32Url from '~/images/icon-32x32.png';
import appleTouchIconUrl from '~/images/apple-touch-icon.png';
import appStylesUrl from '~/styles/app.css';
import { backgroundImageStyles } from '~/styles/background-image';
import { getEnvVars } from '~/utils/env.server';
import SkipNavLink from '~/core/skip-nav-link';
import Header from '~/core/header';
import Footer from '~/core/footer';

export const loader = async () => {
  const { SITE_IMAGE_URL, SITE_IMAGE_ALT } = getEnvVars();

  return json({
    socialImageUrl: SITE_IMAGE_URL,
    socialImageAlt: SITE_IMAGE_ALT,
  });
};

export function shouldRevalidate() {
  // only need the root loader to run once, no need to revalidate
  return false;
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const appName = 'Drinks';
  const title = 'drinks.fyi';
  const description = 'Craft Cocktail Gallery';
  const themeColor = '#137752';
  const socialImageUrl = data?.socialImageUrl || '';
  const socialImageAlt = data?.socialImageAlt || '';

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: socialImageUrl },
    { property: 'og:image:alt', content: socialImageAlt },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: socialImageUrl },
    { name: 'twitter:image:alt', content: socialImageAlt },
    { name: 'application-name', content: appName },
    { name: 'apple-mobile-web-app-title', content: appName },
    { name: 'msapplication-TileColor', content: themeColor },
    { name: 'theme-color', content: themeColor },
  ];
};

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
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
  { rel: 'stylesheet', href: appStylesUrl },
];

export default function App() {
  const location = useLocation();
  const matches = useMatches();
  const isMountRef = React.useRef(true);

  // credit: ShafSpecs/remix-pwa
  React.useEffect(() => {
    const isMount = isMountRef.current;
    isMountRef.current = false;
    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REMIX_NAVIGATION',
          isMount,
          location,
          matches,
          manifest: window.__remixManifest,
        });
      } else {
        const listener = async () => {
          await navigator.serviceWorker.ready;
          navigator.serviceWorker.controller?.postMessage({
            type: 'REMIX_NAVIGATION',
            isMount,
            location,
            matches,
            manifest: window.__remixManifest,
          });
        };
        navigator.serviceWorker.addEventListener('controllerchange', listener);
        return () => {
          navigator.serviceWorker.removeEventListener(
            'controllerchange',
            listener,
          );
        };
      }
    }
  }, [location, matches]);

  return (
    <html
      lang="en"
      className="m-0 min-h-screen bg-neutral-800 bg-cover bg-fixed bg-center bg-no-repeat p-0 leading-tight"
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{ __html: backgroundImageStyles }} />
      </head>
      <body className="relative flex min-h-screen flex-col font-sans font-light">
        <SkipNavLink contentId="main" />
        <Header />
        <div className="flex-1 py-4 sm:w-[26rem] sm:self-center sm:py-8 lg:w-full lg:max-w-[60rem] xl:max-w-[80rem]">
          <Outlet />
        </div>
        <Footer />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
