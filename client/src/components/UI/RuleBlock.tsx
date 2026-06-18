import { cn } from '@/lib/utils';

interface RuleBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  /** Top hairline rule. Default true. */
  top?: boolean;
  /** Bottom hairline rule. Default true. */
  bottom?: boolean;
}

/**
 * Section wrapper: optional top/bottom 1px iron rule, display-face eyebrow above title.
 * Use anywhere a section divider would otherwise be reached for.
 */
export const RuleBlock = ({
  eyebrow,
  title,
  top = true,
  bottom = true,
  className,
  children,
  ...props
}: RuleBlockProps) => (
  <section
    className={cn(
      'py-6',
      top && 'border-t border-border',
      bottom && 'border-b border-border',
      className,
    )}
    {...props}
  >
    {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
    {title && (
      <h2 className="display text-3xl sm:text-4xl text-foreground mb-4">{title}</h2>
    )}
    {children}
  </section>
);

export default RuleBlock;
