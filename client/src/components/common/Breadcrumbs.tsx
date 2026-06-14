import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TruncatedText } from '@/components/common/TruncatedText';
import { Fragment } from 'react';
import type { ReactNode } from 'react';

interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <nav className={cn('flex items-center text-sm text-muted-foreground', className)}>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors mr-2 -ml-2"
        aria-label="Go back"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={index}>
            {index > 0 && <ChevronRight className="mx-2 h-4 w-4" />}
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="hover:text-foreground transition-colors inline-block align-bottom"
              >
                <TruncatedText className="max-w-[150px]">
                  {item.label}
                </TruncatedText>
              </Link>
            ) : (
              <TruncatedText 
                className={cn('font-medium text-foreground max-w-[150px] inline-block align-bottom', isLast && 'pointer-events-none')}
              >
                {item.label}
              </TruncatedText>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
