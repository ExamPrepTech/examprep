import { CheckCircle, Home } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface TestCompletedProps {
    score: number;
    totalMarks: number;
    onReturn: () => void;
    onReview: () => void;
}

export function TestCompleted({ score, totalMarks, onReturn, onReview }: TestCompletedProps) {
    return (
        <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
             <div className="max-w-xl w-full bg-card border rounded-2xl p-12 text-center space-y-8 shadow-xl">
                 <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto ring-8 ring-success/5">
                     <CheckCircle className="w-12 h-12" />
                 </div>
                 
                 <div className="space-y-4">
                     <h1 className="text-3xl font-bold tracking-tight">Test Completed</h1>
                     <p className="text-muted-foreground text-lg">
                         You have successfully submitted your test.
                     </p>
                 </div>

                 <div className="py-8 bg-secondary/30 rounded-xl border border-border/50">
                     <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-2">Your Score</div>
                     <div className="text-5xl font-bold text-primary tabular-nums">
                         {score} <span className="text-2xl text-muted-foreground/60 font-normal">/ {totalMarks}</span>
                     </div>
                 </div>
                 
                 <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                     <Button onClick={onReview} variant="outline" className="min-w-[200px] h-11 gap-2">
                        Review Answers
                     </Button>
                     <Button onClick={onReturn} className="min-w-[200px] h-11 gap-2">
                        <Home className="w-4 h-4" />
                        Return to Tests
                     </Button>
                 </div>
             </div>
        </div>
    );
}
