import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({ title, eyebrow, breadcrumb, actions, className }: PageHeaderProps) => (
  <header className={cn('border-b border-border pb-6 mb-8', className)}>
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="display text-[2.75rem] leading-none tracking-tight text-foreground">
          {title}
        </h1>
        {breadcrumb && <div className="mt-3 marginalia">{breadcrumb}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  </header>
);

export default PageHeader;
