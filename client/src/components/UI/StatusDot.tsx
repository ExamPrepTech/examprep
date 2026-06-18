import { cn } from '@/lib/utils';

export type StatusTone =
  | 'neutral'
  | 'active'
  | 'retained'
  | 'due'
  | 'correct'
  | 'incorrect'
  | 'marked';

const toneClass: Record<StatusTone, string> = {
  neutral: 'bg-iron/40',
  active: 'bg-copper',
  retained: 'bg-phosphor',
  due: 'bg-bruise',
  correct: 'bg-success',
  incorrect: 'bg-destructive',
  marked: 'bg-copper/40',
};

interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  size?: number;
}

export const StatusDot = ({ tone = 'neutral', size = 6, className, ...props }: StatusDotProps) => (
  <span
    className={cn('inline-block', toneClass[tone], className)}
    style={{ width: size, height: size }}
    aria-hidden
    {...props}
  />
);

export default StatusDot;
