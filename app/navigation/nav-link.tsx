import { Link, type LinkProps } from '@remix-run/react';

export default function NavLink({ children, to }: NavLinkProps) {
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

interface NavLinkProps {
  children: LinkProps['children'];
  to: LinkProps['to'];
}
