import React from 'react';
import { cn } from '@/lib/utils';

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  hint?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, hint, className, id, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <label htmlFor={inputId} className="inline-flex items-start gap-2 cursor-pointer select-none">
        <span className="relative inline-flex h-[14px] w-[14px] shrink-0 mt-1 items-center justify-center border border-iron transition-colors">
          <input
            ref={ref}
            id={inputId}
            type="radio"
            className={cn('peer absolute inset-0 opacity-0 cursor-pointer', className)}
            {...props}
          />
          <span className="absolute inset-[3px] bg-transparent peer-checked:bg-copper transition-colors" />
        </span>
        {label && (
          <span className="text-sm leading-tight">
            {label}
            {hint && <span className="block marginalia mt-0.5">{hint}</span>}
          </span>
        )}
      </label>
    );
  },
);
Radio.displayName = 'Radio';

export default Radio;
