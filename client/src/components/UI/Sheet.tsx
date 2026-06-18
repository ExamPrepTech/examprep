import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  width?: number;
  side?: 'right' | 'left';
  className?: string;
}

export const Sheet = ({
  open,
  onClose,
  title,
  eyebrow,
  footer,
  children,
  width = 480,
  side = 'right',
  className,
}: SheetProps) => {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const offscreen = side === 'right' ? { x: width } : { x: -width };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
        >
          <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className={cn(
              'absolute top-0 bottom-0 bg-background border-iron flex flex-col',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              className,
            )}
            style={{ width }}
            initial={reduced ? { opacity: 0 } : offscreen}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : offscreen}
            transition={{ duration: reduced ? 0 : 0.22, ease: 'easeOut' }}
          >
            <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border">
              <div className="min-w-0">
                {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
                {title && (
                  <h2 className="display text-xl text-foreground truncate">{title}</h2>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-iron hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <footer className="px-6 py-4 border-t border-border flex items-center justify-end gap-2 font-mono">
                {footer}
              </footer>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Sheet;
