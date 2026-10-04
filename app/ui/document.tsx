import type { Handle, RemixNode } from "remix/component";
import { ImportMap } from "remix/component/server";
import { hmrClientHref, scriptEntry, stylesheetHref } from "#/app/assets.ts";
import { getEnvVars } from "#/app/core/env.server.ts";
export function Document(
  handle: Handle<{
    children: RemixNode;
    title?: string;
    description?: string;
    socialImage?: string;
    socialImageAlt?: string;
    socialTitle?: string;
    socialDescription?: string;
  }>,
) {
  return () => {
    const env = getEnvVars();
    const {
      children,
      title = "drinks.fyi",
      description = "Craft Cocktail Gallery",
      socialImage = env.SITE_IMAGE_URL,
      socialImageAlt = env.SITE_IMAGE_ALT,
      socialTitle = "drinks.fyi",
      socialDescription = "Craft Cocktail Gallery",
    } = handle.props;
    return (
      <html lang="en" className="m-0 min-h-screen p-0 leading-tight" data-commit={env.COMMIT_SHA}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <meta name="application-name" content="Drinks" />
          <meta name="apple-mobile-web-app-title" content="Drinks" />
          <meta name="msapplication-TileColor" content="#137752" />
          <meta name="theme-color" content="#137752" />
          <title>{title}</title>
          <meta name="description" content={description} />
          <meta property="og:type" content="website" />
          <meta property="og:title" content={socialTitle} />
          <meta property="og:description" content={socialDescription} />
          <meta property="og:image" content={socialImage} />
          <meta property="og:image:alt" content={socialImageAlt} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={socialTitle} />
          <meta name="twitter:description" content={socialDescription} />
          <meta name="twitter:image" content={socialImage} />
          <meta name="twitter:image:alt" content={socialImageAlt} />
          <link rel="preconnect" href="https://ik.imagekit.io/" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://ik.imagekit.io/" />
          <link rel="icon" sizes="any" href="/images/favicon.ico" />
          <link rel="icon" type="image/png" sizes="32x32" href="/images/icon-32x32.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="stylesheet" href={stylesheetHref} />
          <ImportMap value={scriptEntry.importMap} />
          {scriptEntry.preloads.map((href) => (
            <link key={href} rel="modulepreload" href={href} />
          ))}
          <script type="module" src={scriptEntry.href}></script>
          {hmrClientHref && <script type="module" src={hmrClientHref}></script>}
        </head>
        <body className="relative flex min-h-screen flex-col font-sans font-light">{children}</body>
      </html>
    );
  };
}
