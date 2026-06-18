import { cn } from '@/lib/utils';

interface MarginaliaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Collapse marginalia to a top strip below 640px (default true). */
  responsive?: boolean;
}

/**
 * Left-gutter wrapper for the system's voice back to the learner.
 * Holds R values, intervals, due-in, timestamps. Mono, small, iron.
 */
export const Marginalia = ({
  className,
  responsive = true,
  children,
  ...props
}: MarginaliaProps) => (
  <aside
    className={cn(
      'marginalia',
      responsive
        ? 'flex flex-row gap-3 sm:flex-col sm:gap-1 sm:w-24 sm:shrink-0 sm:text-right sm:pr-4'
        : 'w-24 shrink-0 text-right pr-4',
      className,
    )}
    {...props}
  >
    {children}
  </aside>
);

export default Marginalia;
