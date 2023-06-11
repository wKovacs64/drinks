import clsx from 'clsx';

export default function Tag({ children, className }: TagProps) {
  return (
    <div className={clsx('min-w-[4rem] text-center lowercase', className)}>
      {children}
    </div>
  );
}

interface TagProps {
  children: React.ReactNode;
  className?: React.HTMLAttributes<HTMLDivElement>['className'];
}
