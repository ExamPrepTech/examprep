import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  hint?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, hint, className, id, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <label htmlFor={inputId} className="inline-flex items-start gap-2 cursor-pointer select-none">
        <span className="relative inline-flex h-[14px] w-[14px] shrink-0 mt-1 items-center justify-center border border-iron transition-colors">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn('peer absolute inset-0 opacity-0 cursor-pointer', className)}
            {...props}
          />
          <span className="absolute inset-0 bg-transparent peer-checked:bg-copper transition-colors" />
          <Check
            className="relative z-10 text-bone opacity-0 peer-checked:opacity-100"
            size={10}
            strokeWidth={3}
          />
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
Checkbox.displayName = 'Checkbox';

export default Checkbox;
