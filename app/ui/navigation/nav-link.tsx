import type { Handle } from "remix/component";
import { Link, type LinkProps } from "#/app/ui/navigation/link.tsx";

export function NavLink(
  handle: Handle<{
    children: LinkProps["children"];
    to: LinkProps["to"];
  }>,
) {
  return () => {
    const { children, to } = handle.props;
    return (
      <Link
        className="drinks-focusable border-b border-dotted pb-1 transition hover:border-solid focus:border-solid"
        to={to}
        prefetch="viewport"
      >
        {children}
      </Link>
    );
  };
}
