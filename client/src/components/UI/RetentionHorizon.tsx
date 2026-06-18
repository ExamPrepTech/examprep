import { useEffect, useReducer } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Props = {
  /** Current FSRS retrievability, 0..1. If a function, called on each tick for live decay. */
  retrievability: number | (() => number);
  /** When the line shifts from phosphor to bruise. Default 0.9. */
  threshold?: number;
  /** Tick interval ms for live mode. Default 1000. */
  tickMs?: number;
  /** Visual height of the band the line travels across. */
  className?: string;
  /** Optional numeric readout shown in marginalia when reduced motion is on. */
  showReadout?: boolean;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Signature element. 1px line; vertical position encodes current R.
 * Top edge = freshly learned (R≈1). Bottom edge = at forgetting threshold (R≈0).
 * Crosses bruise color once R falls below `threshold`.
 */
export function RetentionHorizon({
  retrievability,
  threshold = 0.9,
  tickMs = 1000,
  className,
  showReadout = false,
}: Props) {
  const reduced = useReducedMotion();
  const [, tick] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (typeof retrievability !== 'function') return;
    const id = window.setInterval(tick, tickMs);
    return () => window.clearInterval(id);
  }, [retrievability, tickMs]);

  const r = clamp01(typeof retrievability === 'function' ? retrievability() : retrievability);
  const topPct = (1 - r) * 100;
  const bruising = r < threshold;
  const color = bruising ? 'var(--bruise)' : 'var(--phosphor)';

  return (
    <div
      className={cn('relative w-full h-px pointer-events-none', className)}
      role="img"
      aria-label={`memory retention ${(r * 100).toFixed(0)} percent`}
    >
      <motion.div
        className="absolute left-0 right-0 h-px"
        initial={false}
        animate={{ top: `${topPct}%`, backgroundColor: color }}
        transition={reduced ? { duration: 0 } : { duration: 1.2, ease: 'easeOut' }}
        style={{ top: `${topPct}%`, backgroundColor: color }}
      />
      {showReadout && (
        <span
          className="absolute -left-24 text-xs marginalia"
          style={{ top: `calc(${topPct}% - 0.6em)` }}
        >
          R={r.toFixed(2)}
        </span>
      )}
    </div>
  );
}

export default RetentionHorizon;
