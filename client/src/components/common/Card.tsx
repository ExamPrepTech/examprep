import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[var(--radius)] border-2 border-border bg-background p-6',
        'transition-colors duration-200',
        onClick && 'cursor-pointer hover:bg-accent/50',
        className
      )}
    >
      {children}
    </div>
  );
}
