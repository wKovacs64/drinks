import type { Handle } from "remix/component";
import { Link, type LinkProps } from "#/app/ui/navigation/link.tsx";

import { classes } from "#/app/core/strings.ts";

export function TagLink(handle: Handle<LinkProps>) {
  return () => {
    const { className, children, ...props } = handle.props;
    return (
      <Link
        className={classes(
          "drinks-focusable bg-maroon text-cream hover:bg-cream hover:text-maroon focus-visible:bg-cream focus-visible:text-maroon rounded-sm border border-solid border-transparent no-underline transition-colors hover:border-current focus-visible:border-current",
          className,
        )}
        prefetch="viewport"
        {...props}
      >
        {children}
      </Link>
    );
  };
}
