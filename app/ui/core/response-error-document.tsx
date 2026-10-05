import { css, type Handle, type RemixNode } from "remix/component";

// These fallbacks render without the application stylesheet.
const errorHeadingStyles = css({ fontSize: "24px" });
const errorDetailsStyles = css({
  padding: "2rem",
  background: "hsla(10, 50%, 50%, 0.1)",
  color: "red",
  overflow: "auto",
});
const errorDocumentStyles = css({ fontFamily: "system-ui, sans-serif", padding: "2rem" });

// Match React Router's root fallback, which rendered outside the application document.
export function ResponseErrorDocument(handle: Handle<{ status: number; statusText?: string }>) {
  return () => (
    <RootErrorDocument title="Unhandled Thrown Response!">
      <h1 mix={errorHeadingStyles}>
        {handle.props.status} {handle.props.statusText}
      </h1>
    </RootErrorDocument>
  );
}

export function ApplicationErrorDocument(handle: Handle<{ details: string }>) {
  return () => (
    <RootErrorDocument title="Application Error!">
      <h1 mix={errorHeadingStyles}>Application Error</h1>
      <pre mix={errorDetailsStyles}>{handle.props.details}</pre>
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
