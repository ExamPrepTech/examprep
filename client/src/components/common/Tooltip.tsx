import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function Tooltip({ content, children, className, delay = 0.2 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Mouse move handler to track cursor
  const handleMouseMove = (e: React.MouseEvent) => {
    // Offset by 10px so cursor doesn't cover tooltip
    setPosition({
      top: e.clientY - 15,
      left: e.clientX
    });
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    // Set initial position
    setPosition({
      top: e.clientY - 15,
      left: e.clientX
    });

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay * 1000);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Close on scroll to prevent detached tooltips
  useEffect(() => {
    if (isVisible) {
      const handleScroll = () => setIsVisible(false);
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn("inline-block", className)}
      >
        {children}
      </div>

      {createPortal(
        <AnimatePresence>
          {isVisible && content && (
            <div
              className="fixed pointer-events-none z-[9999]"
              style={{
                top: position.top,
                left: position.left,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: -10 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="bg-white text-zinc-950 text-xs px-3 py-1.5 rounded-md shadow-md max-w-xs -translate-x-1/2 whitespace-normal break-words leading-relaxed border border-zinc-200"
              >
                {content}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
