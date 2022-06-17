import { Link, type LinkProps } from '@remix-run/react';

export default function NavLink({ children, to }: NavLinkProps) {
  return (
    <li className="inline">
      <Link
        className="border-b border-dotted pb-1 transition ease-default hover:border-solid focus:border-solid focus-visible:outline-none focus-visible:ring"
        to={to}
        prefetch="intent"
      >
        {children}
      </Link>
    </li>
  );
}

interface NavLinkProps {
  children: LinkProps['children'];
  to: LinkProps['to'];
}
