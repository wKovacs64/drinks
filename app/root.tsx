import * as React from 'react';
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
import sourceSansPro200 from '@fontsource/source-sans-pro/latin-200.css';
import sourceSansPro300 from '@fontsource/source-sans-pro/latin-300.css';
import sourceSansPro400 from '@fontsource/source-sans-pro/latin-400.css';
import sourceSansPro600 from '@fontsource/source-sans-pro/latin-600.css';
import sourceSansPro700 from '@fontsource/source-sans-pro/latin-700.css';
import sourceSansPro900 from '@fontsource/source-sans-pro/latin-900.css';
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
  const { socialImageUrl, socialImageAlt } = data;

  return {
    charset: 'utf-8',
    title: title,
    description: description,
    viewport: 'width=device-width,initial-scale=1',
    'og:type': 'website',
    'og:title': title,
    'og:description': description,
    'og:image': socialImageUrl,
    'og:image:alt': socialImageAlt,
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': socialImageUrl,
    'twitter:image:alt': socialImageAlt,
    'application-name': appName,
    'apple-mobile-web-app-title': appName,
    'msapplication-TileColor': themeColor,
    'theme-color': themeColor,
  };
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
  { rel: 'stylesheet', href: sourceSansPro200 },
  { rel: 'stylesheet', href: sourceSansPro300 },
  { rel: 'stylesheet', href: sourceSansPro400 },
  { rel: 'stylesheet', href: sourceSansPro600 },
  { rel: 'stylesheet', href: sourceSansPro700 },
  { rel: 'stylesheet', href: sourceSansPro900 },
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
