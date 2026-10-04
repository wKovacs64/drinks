import type { Handle, Props } from "remix/component";
export type LinkProps = Omit<Props<"a">, "href" | "role"> & {
  to: string;
  prefetch?: string;
};
export function Link(handle: Handle<LinkProps>) {
  return () => {
    const { to, prefetch, children, ...props } = handle.props;
    return (
      <a href={to} data-prefetch={prefetch} {...props}>
        {children}
      </a>
    );
  };
}
