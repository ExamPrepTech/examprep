import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useSpaceStore } from '@/store/spaceStore';
import { cn } from '@/lib/utils';

/**
 * 48px collapsed rail of Space markers. Hover or focus → 240px tree.
 * Subjects/topics tree is lazy — for now only Spaces are shown; subject drill
 * happens via the existing breadcrumb on SubjectLibrary.
 */
export const LeftRail = () => {
  const { spaces } = useSpaceStore();
  const { spaceSlug } = useParams();
  const location = useLocation();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const expanded = open;

  if (location.pathname.startsWith('/login') || location.pathname.startsWith('/register')) {
    return null;
  }

  return (
    <motion.aside
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      animate={{ width: expanded ? 240 : 48 }}
      transition={{ duration: reduced ? 0 : 0.18, ease: 'easeOut' }}
      className="border-r border-border bg-background shrink-0 overflow-hidden flex flex-col"
      aria-label="Spaces"
    >
      <div className="flex flex-col py-3">
        {spaces.map((s) => {
          const active = s.slug === spaceSlug;
          const initial = s.name?.[0]?.toUpperCase() ?? '?';
          return (
            <Link
              key={s.slug}
              to={`/spaces/${s.slug}/library`}
              className={cn(
                'group flex items-center gap-3 h-10 pl-3 pr-3 transition-colors',
                active ? 'bg-muted' : 'hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[0.7rem]',
                  active ? 'border-copper text-copper' : 'border-iron text-iron',
                )}
                style={{ borderRadius: 2 }}
              >
                {initial}
              </span>
              <span
                className={cn(
                  'truncate text-sm font-serif',
                  active ? 'text-foreground' : 'text-iron group-hover:text-foreground',
                  !expanded && 'opacity-0 pointer-events-none',
                )}
              >
                {s.name}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.aside>
  );
};

export default LeftRail;
