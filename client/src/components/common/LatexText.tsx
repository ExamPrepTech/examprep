import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

interface LatexTextProps {
  text: string;
  className?: string;
}

// Multi-row environments (matrix/array/cases/align) or explicit row breaks
// are genuine display math; everything else stays inline within the sentence.
function isDisplayMath(math: string): boolean {
  return /\\begin\{|\\\\/.test(math);
}

export function LatexText({ text, className = '' }: LatexTextProps) {
  if (!text) return null;

  // Split text by [latex]...[/latex] tags
  const parts = text.split(/(\[latex\].*?\[\/latex\])/s);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('[latex]') && part.endsWith('[/latex]')) {
          const math = part.slice(7, -8);
          // Fall back to the raw expression instead of throwing on bad LaTeX.
          const renderError = () => <span className="text-destructive">{math}</span>;
          if (isDisplayMath(math)) {
            return (
              <span key={index} className="block my-2 overflow-x-auto max-w-full">
                <BlockMath math={math} renderError={renderError} />
              </span>
            );
          }
          return <InlineMath key={index} math={math} renderError={renderError} />;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
