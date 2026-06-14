import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/common/Tooltip';
import { LatexText } from '@/components/common/LatexText';

interface TruncatedTextProps {
  children: ReactNode;
  lines?: number;
  className?: string;
  as?: React.ElementType;
  title?: string;
}

export function TruncatedText({
  children,
  lines = 1,
  className,
  as: Component = 'span',
  title
}: TruncatedTextProps) {
  // We prefer the passed title, but if not provided and children is a string, use that.
  const tooltipText = title || (typeof children === 'string' ? children : undefined);

  // Map for line-clamp classes to ensure Tailwind JIT picks them up
  const lineClampClasses: Record<number, string> = {
    1: 'line-clamp-1',
    2: 'line-clamp-2',
    3: 'line-clamp-3',
    4: 'line-clamp-4',
    5: 'line-clamp-5',
    6: 'line-clamp-6',
  };

  // Base classes for truncation
  // If lines is 1, we prefer 'truncate' for simple single-line ellipsis
  // Otherwise try to check lineClamp map, default to nothing if not found or style manually
  const truncationClass = lines === 1 ? 'truncate' : (lineClampClasses[lines] || `line-clamp-[${lines}]`);

  const component = (
    <Component
      className={cn(truncationClass, className)}
    >
      {children}
    </Component>
  );

  if (tooltipText) {
    const tooltipContent = typeof tooltipText === 'string' ? <LatexText text={tooltipText} /> : tooltipText;
    
    return (
      <Tooltip content={tooltipContent} className={cn(lines === 1 ? "w-full block" : "", className?.includes("inline") ? "inline-block" : "block w-full")}>
        {/* We strip the className from the inner component if we are wrapping it, or handle specific cases. 
            Actually, TruncatedText is often structurally important (e.g. flex child). 
            Wrappers can break layout (flex-1).
            Ideally, the Tooltip trigger IS the component. 
            However, Tooltip wraps in a div. 
            Let's make the wrapper fit the flow. 
        */}
        <Component
          className={cn(truncationClass, "w-full", className)} // Ensure inner text takes width and receives styling
        >
          {children}
        </Component>
      </Tooltip>
    );
  }

  return component;
}
