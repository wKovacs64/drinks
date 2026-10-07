import { css, type Handle, type RemixNode } from "remix/component";
import { routes } from "#/app/routes.ts";

// These fallbacks render without the application stylesheet.
const errorHeadingStyles = css({ fontSize: "24px" });
const errorDetailsStyles = css({
  padding: "2rem",
  background: "hsla(10, 50%, 50%, 0.1)",
  color: "red",
  overflow: "auto",
});
const errorDocumentStyles = css({ fontFamily: "system-ui, sans-serif", padding: "2rem" });

export function ResponseErrorDocument(handle: Handle<{ status: number; statusText?: string }>) {
  return () => {
    const { status, statusText } = handle.props;
    const title = `${status} ${statusText ?? (status === 404 ? "Not Found" : "Request failed")}`;
    return (
      <RootErrorDocument title={title}>
        <h1 mix={errorHeadingStyles}>{title}</h1>
        <p>
          {status === 404
            ? "The drink or page you requested could not be found."
            : "We could not complete that request."}
        </p>
        <a href={routes.admin.drinks.index.href()}>Back to Drinks</a>
      </RootErrorDocument>
    );
  };
}

export function ApplicationErrorDocument(handle: Handle<{ details: string }>) {
  return () => (
    <RootErrorDocument title="Server error | drinks.fyi">
      <h1 mix={errorHeadingStyles}>Server error</h1>
      <p>Something went wrong. Please try again.</p>
      <a href={routes.home.href()}>Back to Drinks</a>
      {handle.props.details ? <pre mix={errorDetailsStyles}>{handle.props.details}</pre> : null}
    </RootErrorDocument>
  );
}

function RootErrorDocument(handle: Handle<{ title: string; children: RemixNode }>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
        <title>{handle.props.title}</title>
      </head>
      <body>
        <main mix={errorDocumentStyles}>{handle.props.children}</main>
      </body>
    </html>
  );
}
