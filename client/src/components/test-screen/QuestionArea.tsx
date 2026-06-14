import { Button } from '@/components/common/Button';
import { ContentBlockDisplay } from '@/components/content-blocks/ContentBlockDisplay';
import { ArrowRight, Bookmark, Trash2, Save } from 'lucide-react';
import { LatexText } from '@/components/common/LatexText';

interface QuestionAreaProps {
    questionIndex: number;
    questionBlock: any; // Ideally strictly typed
    userAnswer: unknown;
    onAnswerChange: (value: unknown) => void;
    onMarkForReview: () => void;
    onClearResponse: () => void;
    onSaveAndNext: () => void;
    isLastQuestion?: boolean;
    isReview?: boolean;
    timeSpent?: number;
    isAnswerCorrect?: boolean;
}

export function QuestionArea({
    questionIndex,
    questionBlock,
    userAnswer,
    onAnswerChange,
    onMarkForReview,
    onClearResponse,
    onSaveAndNext,
    isLastQuestion = false,
    isReview = false,
    timeSpent = 0,
    isAnswerCorrect,
}: QuestionAreaProps & { isAnswerCorrect?: boolean }) {
    if (!questionBlock) return <div className="p-8 text-center text-muted-foreground">Question not found</div>;

    // Format time spent
    const minutes = Math.floor(timeSpent / 60);
    const seconds = Math.floor(timeSpent % 60);
    const timeString = `${minutes}m ${seconds}s`;

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-background relative z-0 h-full">
            {/* Question Header */}
            <div className="h-14 border-b flex items-center justify-between px-6 bg-card/30 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Question</span>
                    <span className="font-bold text-xl text-foreground font-mono">{questionIndex + 1}</span>
                </div>
                {isReview && (
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full border">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Time Spent</span>
                        <span className="text-sm font-mono font-bold">{timeString}</span>
                    </div>
                )}
            </div>

            {/* Question Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Review Mode Banner */}
                    {isReview && isAnswerCorrect !== undefined && (
                        <div className={`p-4 rounded-lg border flex items-center gap-3 ${isAnswerCorrect
                                ? 'bg-success/10 border-success/30 text-success'
                                : 'bg-destructive/10 border-destructive/30 text-destructive'
                            }`}>
                            <div className={`font-bold`}>{isAnswerCorrect ? 'Correct Answer' : 'Incorrect Answer'}</div>
                        </div>
                    )}

                    <div className={isReview ? "pointer-events-none opacity-90" : ""}>
                        <ContentBlockDisplay
                            block={questionBlock}
                            isTest={true}
                            value={userAnswer}
                            onChange={onAnswerChange}
                            compareMode={isReview}
                        />
                    </div>

                    {/* Review Mode Details: Explanation & Correct Answer */}
                    {isReview && (
                        <div className="space-y-4">
                            {/* Correct Answer Display */}
                            {!isAnswerCorrect && (
                                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Correct Answer</h4>
                                    <div className="font-medium text-sm">
                                        {questionBlock.kind === 'fill_in_the_blank' ? (
                                            <div className="p-3 bg-background rounded border">
                                                <ContentBlockDisplay 
                                                    block={questionBlock as any} 
                                                    isTest={true} 
                                                    value={userAnswer as string[]} 
                                                    compareMode={true}
                                                    />
                                                <div className="mt-2 text-muted-foreground text-xs uppercase tracking-wide font-bold">Answers:</div>
                                                <ol className="list-decimal pl-5 space-y-1 mt-1">
                                                    {questionBlock.blankAnswers?.map((ans: string, i: number) => (
                                                        <li key={i}><LatexText text={ans} /></li>
                                                    ))}
                                                </ol>
                                            </div>
                                        ) : (
                                            <ul className="list-disc pl-5 space-y-1">
                                                {questionBlock.options?.filter((o: any) => o.isCorrect).map((o: any) => (
                                                    <li key={o.id}><LatexText text={o.text} /></li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Explanation Display */}
                            {questionBlock.explanation && (
                                <div className="p-4 bg-block-mcq-bg rounded-lg border border-block-mcq-border">
                                    <h4 className="text-xs font-bold text-block-mcq-text uppercase tracking-widest mb-2">Explanation</h4>
                                    <div className="text-sm leading-relaxed text-foreground/90">
                                        <LatexText text={questionBlock.explanation} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="h-20 border-t bg-card px-6 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                {!isReview ? (
                    <>
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                className="border shadow-sm gap-2 hover:bg-mark/10 hover:text-mark hover:border-mark/50 transition-colors"
                                onClick={onMarkForReview}
                            >
                                <Bookmark className="w-4 h-4" />
                                <span className="hidden sm:inline">Mark for Review & Next</span>
                                <span className="sm:hidden">Mark</span>
                            </Button>
                            <Button
                                variant="ghost"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
                                onClick={onClearResponse}
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Clear Response</span>
                            </Button>
                        </div>

                        {/* Save / Next Actions */}
                        <Button
                            onClick={onSaveAndNext}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[140px] h-11 text-base shadow-lg shadow-primary/20 gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {isLastQuestion ? 'Save' : 'Save & Next'}
                            {!isLastQuestion && <ArrowRight className="w-4 h-4 opacity-70" />}
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="text-sm text-muted-foreground">Review Mode (Read Only)</div>
                        <Button
                            onClick={onSaveAndNext} // Reusing this for Next navigation
                            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground min-w-[140px] h-11 gap-2"
                        >
                            Next Question
                            <ArrowRight className="w-4 h-4 opacity-70" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
