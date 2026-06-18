import { cn } from '@/lib/utils';

interface BaseProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

const base = 'bg-background text-foreground border border-border transition-colors';
const hover = 'hover:border-iron focus-within:border-iron cursor-pointer';

/** Grid cell — SpaceList, TestDashboard. */
const Tile = ({ className, interactive, ...props }: BaseProps) => (
  <div
    className={cn(base, 'p-5 flex flex-col gap-3', interactive && hover, className)}
    style={{ borderRadius: 2 }}
    {...props}
  />
);

/** Full-width list row — SubjectLibrary, TopicList, sidebar block list. */
const Row = ({ className, interactive, ...props }: BaseProps) => (
  <div
    className={cn(
      'flex items-center gap-4 px-4 py-3 border-b border-border',
      interactive && 'hover:bg-muted cursor-pointer',
      className,
    )}
    {...props}
  />
);

/** Extended Tile for tests — adds emphasis on score row. */
const Test = ({ className, interactive, ...props }: BaseProps) => (
  <div
    className={cn(base, 'p-5 flex flex-col gap-4', interactive && hover, className)}
    style={{ borderRadius: 2 }}
    {...props}
  />
);

export const Card = { Tile, Row, Test };
export default Card;
