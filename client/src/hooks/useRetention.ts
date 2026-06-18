import { useEffect, useReducer } from 'react';

/**
 * Subscribes to a retrievability getter and re-renders at `tickMs` cadence.
 * The getter should pull R from the FSRS scheduler — this hook does no math.
 *
 * Example:
 *   const r = useRetention(() => fsrs.retrievability(card.id));
 */
export function useRetention(getR: () => number, tickMs = 1000) {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = window.setInterval(tick, tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return Math.max(0, Math.min(1, getR()));
}
