import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, mono, className, id, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="eyebrow block">
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex items-center gap-2 border-b border-border focus-within:border-copper transition-colors',
            error && 'border-copper',
          )}
        >
          {prefix && <span className="marginalia">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 bg-transparent border-0 px-0 py-2 text-base text-foreground placeholder:text-iron/60 focus:outline-none',
              mono && 'font-mono text-[0.9375rem]',
              className,
            )}
            {...props}
          />
          {suffix && <span className="marginalia">{suffix}</span>}
        </div>
        {hint && !error && <p className="marginalia">{hint}</p>}
        {error && <p className="marginalia text-copper">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export default Input;
