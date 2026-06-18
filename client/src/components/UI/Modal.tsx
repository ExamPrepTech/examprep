import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** Layer: base | nested | prompt. Controls z-index. */
  layer?: 'base' | 'nested' | 'prompt';
  /** Max width in px or tailwind class via className. */
  width?: number;
  className?: string;
}

const Z = { base: 50, nested: 60, prompt: 70 } as const;

export const Modal = ({
  open,
  onClose,
  title,
  eyebrow,
  footer,
  children,
  layer = 'base',
  width = 560,
  className,
}: ModalProps) => {
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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-start justify-center pt-[10vh] px-4"
          style={{ zIndex: Z[layer] }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
        >
          <div
            className="absolute inset-0 bg-ink/30"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative bg-background border border-iron text-foreground shadow-none w-full',
              className,
            )}
            style={{ maxWidth: width, borderRadius: 2 }}
            initial={{ y: reduced ? 0 : -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduced ? 0 : -8, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
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
            <div className="px-6 py-5">{children}</div>
            {footer && (
              <footer className="px-6 py-4 border-t border-border flex items-center justify-end gap-2 font-mono">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Modal;
