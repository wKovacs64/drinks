import type { Handle, RemixNode } from "remix/component";
export function Nav(handle: Handle<{ children: RemixNode }>) {
  return () => {
    const { children } = handle.props;
    return <nav className="px-4 text-gray-100 sm:p-0">{children}</nav>;
  };
}
