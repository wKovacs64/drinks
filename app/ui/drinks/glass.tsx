import type { Handle, RemixNode } from "remix/component";
import { classes } from "#/app/core/strings.ts";

export function Glass(
  handle: Handle<{
    children: RemixNode;
    className?: string;
  }>,
) {
  return () => {
    const { children, className } = handle.props;
    return (
      <article
        className={classes(
          "border-burnt-orange text-maroon border-y-4 border-double sm:border-x-4",
          className,
        )}
      >
        {children}
      </article>
    );
  };
}
