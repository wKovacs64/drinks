import { clsx } from 'clsx';

export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: React.HTMLAttributes<HTMLDivElement>['className'];
}) {
  return <div className={clsx('min-w-[4rem] text-center lowercase', className)}>{children}</div>;
}
