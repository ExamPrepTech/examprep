import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'icon';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-copper text-bone border border-copper hover:shadow-[inset_0_0_0_1px_var(--ink)]',
  secondary:
    'bg-background text-foreground border border-iron hover:bg-muted',
  outline:
    'bg-transparent text-foreground border border-border hover:border-iron hover:bg-muted',
  ghost:
    'bg-transparent text-foreground border border-transparent hover:underline underline-offset-[6px] decoration-copper decoration-2',
  destructive:
    'bg-transparent text-bruise border border-bruise hover:bg-bruise hover:text-bone',
  icon:
    'bg-transparent text-iron border border-transparent hover:text-foreground hover:bg-muted',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-9 w-9',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size, isLoading, children, disabled, type = 'button', ...props },
    ref,
  ) => {
    const resolvedSize: Size = size ?? (variant === 'icon' ? 'icon' : 'md');
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-mono uppercase tracking-wide text-[0.78rem] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none',
          variantClass[variant],
          sizeClass[resolvedSize],
          className,
        )}
        style={{ borderRadius: 2 }}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" size={14} />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export default Button;
