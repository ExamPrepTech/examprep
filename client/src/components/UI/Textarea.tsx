import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  mono?: boolean;
  autoGrow?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, mono, autoGrow, className, value, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const setRefs = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof forwardedRef === 'function') forwardedRef(el);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    useEffect(() => {
      if (!autoGrow) return;
      const el = innerRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [autoGrow, value]);

    return (
      <div className="w-full space-y-1.5">
        {label && <label className="eyebrow block">{label}</label>}
        <textarea
          ref={setRefs}
          value={value}
          className={cn(
            'block w-full bg-transparent border-0 border-b border-border px-0 py-2 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-copper transition-colors resize-none',
            mono && 'font-mono text-[0.9375rem]',
            error && 'border-copper',
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="marginalia">{hint}</p>}
        {error && <p className="marginalia text-copper">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export default Textarea;
