import { Link, type LinkProps } from 'react-router';
import { clsx } from 'clsx';

export function TagLink({ className, children, ...props }: LinkProps) {
  return (
    <Link
      className={clsx(
        'drinks-focusable bg-maroon text-cream hover:bg-cream hover:text-maroon focus-visible:bg-cream focus-visible:text-maroon rounded-sm border border-solid border-transparent no-underline transition-colors hover:border-current focus-visible:border-current',
        className,
      )}
      prefetch="viewport"
      {...props}
    >
      {children}
    </Link>
  );
}
