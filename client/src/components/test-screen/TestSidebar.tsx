import { User } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/utils';

export type QuestionStatus = 'answered' | 'not_answered' | 'marked' | 'marked_answered' | 'not_visited' | 'correct' | 'incorrect';

interface TestSidebarProps {
    userName: string;
    questions: any[]; // Ideally strict type
    currentQuestionIndex: number;
    answers: Record<string, unknown>;
    markedForReview: Set<number>;
    visitedQuestions: Set<number>;
    onQuestionChange: (index: number) => void;
    onSubmit: () => void;
    isReview?: boolean;
}

export function TestSidebar({
    userName,
    questions,
    currentQuestionIndex,
    answers,
    markedForReview,
    visitedQuestions,
    onQuestionChange,
    onSubmit,
    isReview = false
}: TestSidebarProps) {
    
    const getQuestionStatus = (idx: number, blockId: string, question: any): QuestionStatus => {
        if (isReview) {
            if (question.isCorrect) return 'correct';
            if (question.isCorrect === false) return 'incorrect';
        }

        const isAnswered = answers[blockId] !== undefined && answers[blockId] !== null && (Array.isArray(answers[blockId]) ? (answers[blockId] as any[]).length > 0 : answers[blockId] !== '');
        const isMarked = markedForReview.has(idx);
        const isVisited = visitedQuestions.has(idx);

        if (isAnswered && isMarked) return 'marked_answered';
        if (isAnswered) return 'answered';
        if (isMarked) return 'marked';
        if (isVisited && !isAnswered) return 'not_answered';
        return 'not_visited';
    };

    const getStatusColor = (status: QuestionStatus) => {
        switch (status) {
            case 'correct': return 'bg-success text-success-foreground border-success hover:bg-success/90';
            case 'incorrect': return 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90';
            case 'answered': return 'bg-success text-success-foreground border-success hover:bg-success/90';
            case 'not_answered': return 'bg-destructive/20 text-destructive border-destructive/20 hover:bg-destructive/30';
            case 'marked': return 'bg-mark text-mark-foreground border-mark hover:bg-mark/90';
            case 'marked_answered': return 'bg-mark text-mark-foreground border-mark relative'; 
            default: return 'bg-background text-foreground border-border hover:bg-secondary';
        }
    };

    const counts = {
        answered: 0,
        notAnswered: 0,
        notVisited: 0,
        marked: 0,
        markedAnswered: 0,
        correct: 0,
        incorrect: 0
    };
    
    questions.forEach((q, idx) => {
        const s = getQuestionStatus(idx, q.blockId, q);
        if (s === 'correct') counts.correct++;
        else if (s === 'incorrect') counts.incorrect++;
        else if (s === 'answered') counts.answered++;
        else if (s === 'not_answered') counts.notAnswered++;
        else if (s === 'marked') counts.marked++;
        else if (s === 'marked_answered') counts.markedAnswered++;
        else counts.notVisited++;
    });

    return (
        <div className="w-[320px] bg-popover border-l flex flex-col shrink-0 h-full shadow-xl z-10">
            {/* User Profile */}
            <div className="p-4 flex items-center gap-3 border-b bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{userName}</div>
                    <div className="text-xs text-muted-foreground">Examinee</div>
                </div>
            </div>

            {/* Legend - Grid Layout */}
            <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] border-b bg-background/50">
                {isReview ? (
                    <>
                        <LegendItem count={counts.correct} label="Correct" color="bg-success text-success-foreground" />
                        <LegendItem count={counts.incorrect} label="Incorrect" color="bg-destructive text-destructive-foreground" />
                        <LegendItem count={questions.length - (counts.correct + counts.incorrect)} label="Ungraded" color="bg-background border border-border text-foreground" />
                    </>
                ) : (
                    <>
                        <LegendItem count={counts.answered} label="Answered" color="bg-success text-success-foreground" />
                        <LegendItem count={counts.notAnswered} label="Not Answered" color="bg-destructive/10 text-destructive border border-destructive/20" />
                        <LegendItem count={counts.notVisited} label="Not Visited" color="bg-background border border-border text-foreground" />
                        <LegendItem count={counts.marked} label="Marked" color="bg-mark text-mark-foreground" />
                        <div className="col-span-2 flex items-center gap-1.5 opacity-80">
                             <div className="w-5 h-5 rounded-md flex items-center justify-center bg-mark text-mark-foreground text-[10px] font-bold relative border border-border/50">
                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-success rounded-full border border-white"></div>
                                {counts.markedAnswered}
                             </div> 
                             <span className="text-muted-foreground font-medium">Marked & Answered</span>
                        </div>
                    </>
                )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="flex items-center justify-between mb-4">
                     <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Question Palette</div>
                     <div className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
                         {questions.length} Total
                     </div>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, idx) => {
                        const status = getQuestionStatus(idx, q.blockId, q);
                        const colorClass = getStatusColor(status);
                        
                        return (
                            <button 
                                key={idx}
                                onClick={() => onQuestionChange(idx)}
                                className={cn(
                                    "h-9 rounded-md text-xs font-semibold border transition-all relative flex items-center justify-center shadow-sm",
                                    colorClass,
                                    idx === currentQuestionIndex 
                                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background z-10 scale-105" 
                                        : "opacity-90 hover:opacity-100 hover:scale-105"
                                )}
                            >
                                {idx + 1}
                                {status === 'marked_answered' && (
                                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-success rounded-full border border-background shadow-sm"></div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t bg-muted/30 space-y-3">
                 <Button 
                    variant={isReview ? "secondary" : "primary"}
                    className={cn(
                        "w-full font-semibold shadow-md py-6 text-base",
                        !isReview && "bg-primary hover:bg-primary/90 text-primary-foreground"
                    )}
                    onClick={onSubmit}
                 >
                    {isReview ? "Exit Review" : "Submit Test"}
                 </Button>
            </div>
        </div>
    );
}

function LegendItem({ count, label, color }: { count: number, label: string, color: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className={cn("w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shadow-sm", color)}>
                {count}
            </div>
            <span className="text-muted-foreground font-medium">{label}</span>
        </div>
    );
}
