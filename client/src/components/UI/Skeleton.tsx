import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visible width/height carriers; pass via className for tailwind sizing. */
  shimmer?: boolean;
}

export const Skeleton = ({ className, shimmer = true, ...props }: SkeletonProps) => {
  const reduced = useReducedMotion();
  return (
    <div
      className={cn(
        'border border-iron/40',
        shimmer && !reduced && 'animate-pulse',
        className,
      )}
      aria-hidden
      {...props}
    />
  );
};

export default Skeleton;
