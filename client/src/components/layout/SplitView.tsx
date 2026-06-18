import { cn } from '@/lib/utils';

interface SplitViewProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar: React.ReactNode;
  sidebarWidth?: number;
  /** Fixed-height split that fills the available viewport. */
  fillViewport?: boolean;
}

export const SplitView = ({
  sidebar,
  sidebarWidth = 280,
  fillViewport = true,
  className,
  children,
  ...props
}: SplitViewProps) => (
  <div
    className={cn(
      'flex w-full',
      fillViewport && 'h-[calc(100vh-56px)]',
      className,
    )}
    {...props}
  >
    <aside
      className="shrink-0 border-r border-border overflow-hidden flex flex-col"
      style={{ width: sidebarWidth }}
    >
      {sidebar}
    </aside>
    <section className="flex-1 min-w-0 overflow-y-auto">{children}</section>
  </div>
);

export default SplitView;
