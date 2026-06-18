import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: Option[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, ...props }, ref) => (
    <div className="w-full space-y-1.5">
      {label && <label className="eyebrow block">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'block w-full appearance-none bg-transparent border-0 border-b border-border px-0 py-2 pr-6 font-mono text-[0.9375rem] text-foreground focus:outline-none focus:border-copper transition-colors',
            error && 'border-copper',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-iron"
          size={14}
        />
      </div>
      {hint && !error && <p className="marginalia">{hint}</p>}
      {error && <p className="marginalia text-copper">{error}</p>}
    </div>
  ),
);
Select.displayName = 'Select';

export default Select;
