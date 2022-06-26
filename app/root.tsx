import * as React from 'react';
import {
  json,
  type LinksFunction,
  type LoaderFunction,
  type MetaFunction,
} from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
  useLocation,
  useMatches,
} from '@remix-run/react';
// @ts-ignore
import faviconIcoUrl from '../public/favicon.ico';
import icon32Url from '~/images/icon-32x32.png';
import appleTouchIconUrl from '~/images/apple-touch-icon.png';
import appStylesUrl from '~/styles/app.generated.css';
import { sourceSansProFontFaces } from '~/styles/font-faces';
import { backgroundImageStyles } from '~/styles/background-image';
import { getEnvVars } from '~/utils/env.server';
import SkipNavLink from '~/components/skip-nav-link';
import Header from '~/components/header';
import Footer from '~/components/footer';
import ErrorPage from '~/components/error-page';
import NotFoundPage from '~/routes/$';

// HACK: this is a workaround for Remix issue 3414
import icon192Url from '~/images/icon-192x192.png';
import icon512Url from '~/images/icon-512x512.png';
import iconMaskable192Url from '~/images/icon-maskable-192x192.png';
import iconMaskable512Url from '~/images/icon-maskable-512x512.png';
// you must "use" the imported URL for this hack or the assets won't be built
console.assert(typeof icon192Url === 'string');
console.assert(typeof icon512Url === 'string');
console.assert(typeof iconMaskable192Url === 'string');
console.assert(typeof iconMaskable512Url === 'string');
// END HACK

interface LoaderData {
  socialImageUrl: string;
  socialImageAlt: string;
}

export const loader: LoaderFunction = async () => {
  const { SITE_IMAGE_URL, SITE_IMAGE_ALT } = getEnvVars();

  return json<LoaderData>({
    socialImageUrl: SITE_IMAGE_URL,
    socialImageAlt: SITE_IMAGE_ALT,
  });
};

export const meta: MetaFunction = ({ data }: { data: LoaderData }) => {
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
  { rel: 'stylesheet', href: appStylesUrl },
];

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="m-0 min-h-screen bg-neutral-800 bg-cover bg-fixed bg-center bg-no-repeat p-0 leading-tight"
    >
      <head>
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{ __html: sourceSansProFontFaces }} />
        <style dangerouslySetInnerHTML={{ __html: backgroundImageStyles }} />
      </head>
      <body className="relative flex min-h-screen flex-col font-sans font-light">
        <SkipNavLink contentId="main" />
        <Header />
        <div className="flex-1 py-4 sm:w-[26rem] sm:self-center sm:py-8 lg:w-full lg:max-w-[60rem] xl:max-w-[80rem]">
          {children}
        </div>
        <Footer />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

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
    <Layout>
      <Outlet />
    </Layout>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  return (
    <Layout>
      {caught.status === 404 ? <NotFoundPage /> : <ErrorPage caught={caught} />}
    </Layout>
  );
}
