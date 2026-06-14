import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestHeaderProps {
    title: string;
    timeLeft: number | null;
    totalQuestions: number;
    onPause: () => void;
    isReview?: boolean;
}

export function TestHeader({ title, timeLeft, totalQuestions, onPause, isReview = false }: TestHeaderProps) {
    // Helper for formatting time if not imported
    const formatTimeDisplay = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-14 border-b bg-popover/60 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 shadow-sm z-20 sticky top-0">
           <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Zap className="w-4 h-4 fill-current" />
               </div>
               <div className="font-semibold text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                  {title}
               </div>
               <div className="hidden md:block h-4 w-px bg-border mx-2" />
               <div className="hidden md:block text-xs text-muted-foreground font-medium uppercase tracking-wider">
                   {totalQuestions} Questions
               </div>
           </div>
           
           <div className="flex items-center gap-4">
               {!isReview && (
                   <>
                       <button 
                          onClick={onPause}
                          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-secondary/80"
                       >
                           Pause
                       </button>

                       <div className="bg-secondary/50 border border-border px-3 py-1.5 rounded-md text-sm font-mono font-medium flex items-center gap-2">
                           <span className="text-muted-foreground text-xs uppercase tracking-wider">Time Left</span>
                           <span className={cn(
                               "text-foreground font-bold tabular-nums",
                               timeLeft !== null && timeLeft < 300 && "text-destructive animate-pulse"
                           )}>
                             {timeLeft !== null ? formatTimeDisplay(timeLeft) : "--:--:--"}
                           </span>
                       </div>
                   </>
               )}
           </div>
        </div>
    );
}
