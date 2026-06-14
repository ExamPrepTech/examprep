import { useMemo, useState } from 'react';
import type { FillInTheBlankBlock } from '@/types/domain';
import { cn } from '@/lib/utils';
import { Check, X, Send, RotateCcw, Eye } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { BlockFooter } from '@/components/content-blocks/BlockFooter';
import { LatexText } from '@/components/common/LatexText';
import { QuestionImage } from '@/components/common/QuestionImage';

interface FillInTheBlankBlockProps {
    block: FillInTheBlankBlock;
    isTest?: boolean;
    value?: string[]; // Array of user answers co-indexed with blanks
    onChange?: (value: string[]) => void;
    showCorrectValues?: boolean; // For review mode to just SHOW answers in place
    compareMode?: boolean; // For review mode to compare user vs correct
    onSubmit?: () => void;
    onShowAnswer?: () => void;
}

export function FillInTheBlankBlock({
    block,
    value,
    onChange,
    showCorrectValues = false,
    compareMode = false,
    isTest = false,
    onSubmit,
    onShowAnswer
}: FillInTheBlankBlockProps) {

    // Unified state (local fallbacks if uncontrolled)
    const [localValue, setLocalValue] = useState<string[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [visibleHints, setVisibleHints] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);

    // Derive current selection from controlled value if present, else local
    const formState = (value !== undefined && Array.isArray(value)) ? value : (value !== undefined ? [] : localValue);

    // Parse the question to find parts and blanks
    // Format assumed: "The capital of France is {{blank}} and Italy is {{blank}}."
    // Note: We use a distinctive separator.
    const parts = useMemo(() => {
        return (block.question || '').split('{{blank}}');
    }, [block.question]);

    const blanksCount = parts.length - 1;

    const handleInputChange = (index: number, val: string) => {
        // In test mode, we do not block changes unless enforced elsewhere
        if (isSubmitted && !isTest) return;

        const newValue = [...(formState || [])];
        // Ensure array is long enough
        while (newValue.length < blanksCount) newValue.push('');

        newValue[index] = val;

        if (onChange) {
            onChange(newValue);
        } else {
            setLocalValue(newValue);
        }
    };

    const handleSubmit = () => {
        setIsSubmitted(true);
        if (onSubmit) onSubmit();
    };

    const handleReset = () => {
        if (onChange) onChange([]);
        else setLocalValue([]);

        setIsSubmitted(false);
        setShowAnswer(false);
        setVisibleHints(0);
        setShowExplanation(false);
    };

    const renderPart = (part: string, index: number) => (
        <span key={`text-${index}`} className="whitespace-pre-wrap leading-loose"><LatexText text={part} /></span>
    );

    const renderBlank = (index: number) => {
        const userAnswer = formState[index] || '';
        const correctAnswer = block.blankAnswers?.[index];
        const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();

        // Determine state for display
        const shouldShowResult = compareMode || (!isTest && (isSubmitted || showAnswer));

        if (shouldShowResult) {
            // Comparison / Result View

            // If purely showing answers (Dashboard/ReadOnly), simplified view
            if (showCorrectValues && !compareMode && !isSubmitted && !showAnswer) {
                return (
                    <span key={`blank-${index}`} className="mx-1 px-2 py-0.5 rounded bg-muted font-bold border-b-2 border-primary/20 text-primary inline-block min-w-[3rem] text-center align-baseline">
                        {correctAnswer}
                    </span>
                );
            }

            // Detailed Result View (Practice Check or Review Comparison)
            let displayClass = "";
            let icon = null;

            if (showAnswer) {
                displayClass = "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300";
            } else if (isCorrect) {
                displayClass = "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300";
                icon = <Check className="w-3 h-3" />;
            } else {
                displayClass = "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300 decoration-wavy decoration-red-400";
                icon = <X className="w-3 h-3" />;
            }

            return (
                <span key={`blank-${index}`} className="inline-flex items-center align-middle mx-1 gap-1">
                    {/* User Answer (Red if wrong) */}
                    <span className={cn(
                        "px-2 py-0.5 rounded border text-sm font-medium inline-flex items-center gap-1",
                        displayClass
                    )}>
                        {showAnswer ? (correctAnswer || "No Answer") : (userAnswer || <span className="italic opacity-50 text-xs text-muted-foreground">Empty</span>)}
                        {icon}
                    </span>

                    {/* Correct Answer (Green, shown next to wrong answer) */}
                    {!isCorrect && !showAnswer && (
                        <span className="px-2 py-0.5 rounded border text-sm font-medium inline-flex items-center gap-1 bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300">
                             <Check className="w-3 h-3" />
                             {correctAnswer}
                        </span>
                    )}
                </span>
            );
        }

        // Default Input Mode
        return (
            <input
                key={`input-${index}`}
                type="text"
                className="mx-1.5 inline-block text-center min-w-[120px] px-2 py-1 bg-transparent border-b-2 border-input focus:border-primary focus:outline-none transition-colors text-foreground font-medium placeholder:text-muted-foreground/30 rounded-t-sm focus:bg-accent/10"
                value={userAnswer}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder="..."
                autoComplete="off"
                disabled={isSubmitted && !isTest}
            />
        );
    };

    const hasAnyInput = formState?.length > 0 && formState.some(s => s.trim().length > 0);

    return (
        <Card className={cn("transition-shadow", isTest ? "shadow-none border-0 p-0" : "hover:shadow-md")}>
            <QuestionImage url={block.imageUrl} />
            <div className="text-lg leading-loose">
                {parts.map((part, index) => (
                    <span key={index}>
                        {renderPart(part, index)}
                        {index < blanksCount && renderBlank(index)}
                    </span>
                ))}
            </div>

            {!isTest && (
                <>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        {!isSubmitted && (
                            <Button onClick={handleSubmit} disabled={!hasAnyInput}>
                                <Send className="w-4 h-4 mr-2" /> Submit
                            </Button>
                        )}

                        {(isSubmitted || showAnswer || visibleHints > 0 || showExplanation) && (
                            <Button variant="outline" onClick={handleReset}>
                                <RotateCcw className="w-4 h-4 mr-2" /> Reset
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            onClick={() => {
                                const nextState = !showAnswer;
                                setShowAnswer(nextState);
                                if (nextState && onShowAnswer) {
                                    onShowAnswer();
                                }
                            }}
                            className={cn("text-muted-foreground", showAnswer && "text-primary")}
                        >
                            <Eye className="w-4 h-4 mr-2" /> {showAnswer ? "Hide Answer" : "Show Answer"}
                        </Button>
                    </div>

                    <BlockFooter
                        explanation={block.explanation}
                        notes={block.notes}
                        hints={block.hints}
                        visibleHints={visibleHints}
                        onNextHint={() => setVisibleHints(prev => prev + 1)}
                        showExplanation={showExplanation}
                        onToggleExplanation={() => setShowExplanation(!showExplanation)}
                    />
                </>
            )}
        </Card>
    );
}
