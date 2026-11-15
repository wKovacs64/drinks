import type { Handle, Props } from "remix/component";

import { classes } from "#/app/core/public/strings.ts";

export function TagLink(handle: Handle<Omit<Props<"a">, "href" | "role"> & { href: string }>) {
  return () => {
    const { className, children, ...props } = handle.props;

    return (
      <a
        className={classes(
          "drinks-focusable bg-maroon text-cream hover:bg-cream hover:text-maroon focus-visible:bg-cream focus-visible:text-maroon selection:bg-cream selection:text-maroon hover:selection:bg-maroon hover:selection:text-cream focus-visible:selection:bg-maroon focus-visible:selection:text-cream rounded-sm border border-solid border-transparent no-underline transition-colors hover:border-current focus-visible:border-current",
          className,
        )}
        {...props}
        data-rmx-prefetch="viewport"
      >
        {children}
      </a>
    );
  };
}
