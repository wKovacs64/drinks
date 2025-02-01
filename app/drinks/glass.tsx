import { clsx } from 'clsx';

export function Glass({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: React.HTMLAttributes<HTMLElement>['className'];
}) {
  return (
    <article
      className={clsx(
        'border-burnt-orange text-maroon border-y-4 border-double sm:border-x-4',
        className,
      )}
    >
      {children}
    </article>
  );
}
