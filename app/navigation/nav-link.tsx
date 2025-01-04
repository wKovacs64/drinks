import { Link, type LinkProps } from 'react-router';

export function NavLink({
  children,
  to,
}: {
  children: LinkProps['children'];
  to: LinkProps['to'];
}) {
  return (
    <Link
      className="drinks-focusable border-b border-dotted pb-1 transition hover:border-solid focus:border-solid"
      to={to}
      prefetch="viewport"
    >
      {children}
    </Link>
  );
}
