import clsx from 'clsx';

export default function Glass({ children, className }: GlassProps) {
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

interface GlassProps {
  children: React.ReactNode;
  className?: React.HTMLAttributes<HTMLElement>['className'];
}
