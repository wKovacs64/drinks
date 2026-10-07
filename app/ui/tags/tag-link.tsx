import type { Handle, Props } from "remix/component";
import { ViewportPrefetch } from "#/app/ui/navigation/public/viewport-prefetch.tsx";

import { classes } from "#/app/core/public/strings.ts";

export function TagLink(handle: Handle<Omit<Props<"a">, "href" | "role"> & { href: string }>) {
  return () => {
    const { className, children, ...props } = handle.props;
    return (
      <a
        className={classes(
          "drinks-focusable bg-maroon text-cream hover:bg-cream hover:text-maroon focus-visible:bg-cream focus-visible:text-maroon rounded-sm border border-solid border-transparent no-underline transition-colors hover:border-current focus-visible:border-current",
          className,
        )}
        {...props}
      >
        <ViewportPrefetch href={props.href} />
        {children}
      </a>
    );
  };
}
