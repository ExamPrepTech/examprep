
import { Button } from '@/components/common/Button';
import { Lightbulb, Info } from 'lucide-react';
import { LatexText } from '@/components/common/LatexText';

interface BlockFooterProps {
  explanation?: string;
  notes?: string;
  hints?: string[];
  visibleHints: number;
  onNextHint: () => void;
  showExplanation: boolean;
  onToggleExplanation: () => void;
}

export function BlockFooter({ 
  explanation, 
  notes, 
  hints,
  visibleHints,
  onNextHint,
  showExplanation,
  onToggleExplanation
}: BlockFooterProps) {
  
  const hasContent = explanation || notes || (hints && hints.length > 0);
  if (!hasContent) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      {/* Hints Section */}
      {hints && hints.length > 0 && (
        <div className="space-y-2">
           {hints.slice(0, visibleHints).map((hint, idx) => (
             <div key={idx} className="bg-warning/10 border border-warning/20 p-3 rounded-md text-sm text-warning flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                <span><span className="font-semibold">Hint {idx + 1}:</span> <LatexText text={hint} /></span>
             </div>
           ))}
           {visibleHints < hints.length && (
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={onNextHint}
               className="text-warning hover:text-warning hover:bg-warning/10 p-0 h-auto font-medium"
             >
               <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
               Show {visibleHints === 0 ? 'Hint' : 'Next Hint'}
             </Button>
           )}
        </div>
      )}

      {/* Explanation & Notes Section */}
      {(explanation || notes) && (
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleExplanation}
            className="text-muted-foreground hover:text-primary italic p-0 h-auto"
          >
            {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
          </Button>
          
          {showExplanation && (
             <div className="mt-2 space-y-3 animate-in fade-in zoom-in-95 duration-200">
               {explanation && (
                 <div className="text-sm bg-accent/20 p-3 rounded-md border border-accent/30 whitespace-pre-wrap">
                   <span className="font-semibold text-accent-foreground block mb-1">Explanation:</span>
                   {/^https?:\/\/\S+$/.test(explanation.trim()) ? (
                     <a
                       href={explanation.trim()}
                       target="_blank"
                       rel="noreferrer"
                       className="text-primary underline break-all hover:text-primary/80"
                     >
                       View detailed solution
                     </a>
                   ) : (
                     <LatexText text={explanation} />
                   )}
                 </div>
               )}
               
               {notes && (
                 <div className="text-sm bg-muted/30 p-3 rounded-md border border-border flex items-start gap-2 whitespace-pre-wrap">
                    <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="font-semibold text-foreground/80 block mb-1">Note:</span>
                      <div className="text-foreground/70"><LatexText text={notes} /></div>
                    </div>
                 </div>
               )}
             </div>
          )}
        </div>
      )}
    </div>
  );
}

