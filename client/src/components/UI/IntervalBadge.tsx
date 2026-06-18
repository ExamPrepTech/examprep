import { cn } from '@/lib/utils';

interface IntervalBadgeProps {
  from?: string | number;
  to: string | number;
  /** Unit shown after each value (e.g. "d", "h"). If omitted, values are rendered as-is. */
  unit?: string;
  className?: string;
}

export const IntervalBadge = ({ from, to, unit = '', className }: IntervalBadgeProps) => (
  <span
    className={cn(
      'inline-flex items-baseline gap-1 font-mono text-xs text-iron tracking-tight',
      className,
    )}
  >
    {from !== undefined && (
      <>
        <span>{from}{unit}</span>
        <span aria-hidden>→</span>
      </>
    )}
    <span className="text-copper">{to}{unit}</span>
  </span>
);

export default IntervalBadge;
