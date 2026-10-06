import type { Handle, RemixNode } from "remix/component";
import { classes } from "#/app/core/public/strings.ts";

export function Tag(
  handle: Handle<{
    children: RemixNode;
    className?: string;
  }>,
) {
  return () => {
    const { children, className } = handle.props;
    return (
      <div className={classes("min-w-[4rem] text-center lowercase", className)}>{children}</div>
    );
  };
}
