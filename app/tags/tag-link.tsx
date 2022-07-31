import { Link, type LinkProps } from '@remix-run/react';
import clsx from 'clsx';

export default function TagLink({ className, children, ...props }: LinkProps) {
  return (
    <Link
      className={clsx(
        'rounded border border-solid border-transparent bg-maroon text-cream no-underline transition-colors ease-default hover:border-current hover:bg-cream hover:text-maroon focus-visible:border-current focus-visible:bg-cream focus-visible:text-maroon focus-visible:outline-none focus-visible:ring',
        className,
      )}
      prefetch="intent"
      {...props}
    >
      {children}
    </Link>
  );
}
