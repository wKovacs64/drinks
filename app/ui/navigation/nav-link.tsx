import type { Handle, Props } from "remix/component";

export function NavLink(
  handle: Handle<{
    children: Props<"a">["children"];
    href: string;
  }>,
) {
  return () => {
    const { children, href } = handle.props;
    return (
      <a
        className="drinks-focusable border-b border-dotted pb-1 transition hover:border-solid focus:border-solid"
        href={href}
        data-rmx-prefetch="viewport"
      >
        {children}
      </a>
    );
  };
}
