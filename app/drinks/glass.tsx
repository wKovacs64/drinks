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
        'border-y-4 border-double border-burnt-orange text-maroon sm:border-x-4',
        className,
      )}
    >
      {children}
    </article>
  );
}
