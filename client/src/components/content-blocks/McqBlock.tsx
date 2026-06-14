import { useState } from 'react';
import type { SingleSelectMcqBlock, MultiSelectMcqBlock } from '@/types/domain';
import { Card } from '@/components/common/Card';
import { BlockFooter } from '@/components/content-blocks/BlockFooter';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/utils';
import { CheckSquare, Square, CheckCircle2, XCircle, RotateCcw, Eye, Send } from 'lucide-react';
import { LatexText } from '@/components/common/LatexText';
import { QuestionImage } from '@/components/common/QuestionImage';

interface McqBlockProps {
    block: SingleSelectMcqBlock | MultiSelectMcqBlock;
    isTest?: boolean;
    value?: string | string[];
    onChange?: (val: any) => void;
    onSubmit?: () => void;
    compareMode?: boolean;
    onShowAnswer?: () => void;
}

export function McqBlock({ block, isTest = false, value, onChange, onSubmit, compareMode = false, onShowAnswer }: McqBlockProps) {
    const isMulti = block.kind === 'multi_select_mcq';

    // Unified state (local fallbacks if uncontrolled)
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [visibleHints, setVisibleHints] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);

    // Derive current selection from controlled value if present, else local
    const currentSelection: string[] = value !== undefined
        ? (Array.isArray(value) ? value : (value ? [value] : []))
        : localSelectedIds;

    const handleSelect = (id: string) => {
        // In test mode, we don't block selection based on 'isSubmitted' unless explicitly enforced elsewhere
        if ((isSubmitted || compareMode) && !isTest) return; // Block validation only in Practice

        // In Review Mode (compareMode), interaction should strictly be disabled
        if (compareMode) return;

        let newSelection: string[];
        if (isMulti) {
            newSelection = currentSelection.includes(id)
                ? currentSelection.filter(oid => oid !== id)
                : [...currentSelection, id];
        } else {
            newSelection = [id];
            if (!isTest) {
                setIsSubmitted(true); // Auto-submit in practice mode only
                if (onSubmit) onSubmit(); // Trigger parent submit logic (Show Answer)
            }
        }

        if (onChange) {
            // Return string for single, array for multi to match expectation
            onChange(isMulti ? newSelection : newSelection[0]);
        } else {
            setLocalSelectedIds(newSelection);
        }
    };

    const handleSubmit = () => {
        setIsSubmitted(true);
        if (onSubmit) onSubmit(); // Trigger parent submit logic
    };

    const handleReset = () => {
        if (onChange) onChange(isMulti ? [] : '');
        else setLocalSelectedIds([]);

        setIsSubmitted(false);
        setShowAnswer(false);
        setVisibleHints(0);
        setShowExplanation(false);
    };

    const handleToggleShowAnswer = () => {
        const nextState = !showAnswer;
        setShowAnswer(nextState);
        if (nextState && onShowAnswer) {
            onShowAnswer();
        }
    };

    return (
        <Card className={cn("transition-shadow", isTest ? "shadow-none border-0 p-0" : "hover:shadow-md")}>
            <h3 className="text-lg font-medium mb-4 text-foreground flex items-start">
                {isMulti && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-1 rounded-sm mr-2 align-middle border border-border shrink-0">
                        Multi-Select
                    </span>
                )}
                <span className="flex-1 whitespace-pre-wrap"><LatexText text={block.question || ''} /></span>
            </h3>

            <QuestionImage url={block.imageUrl} />

            <div className="space-y-2">
                {block.options.map((option) => {
                    const isSelected = currentSelection.includes(option.id);
                    const isCorrect = option.isCorrect;

                    let containerClass = "border-border hover:bg-accent/50 cursor-pointer";
                    let textClass = "text-foreground";

                    // Icon selection based on type
                    let icon;
                    if (isMulti) {
                        icon = isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground" />;
                    } else {
                        icon = (
                            <div className={cn(
                                "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                                isSelected ? "border-primary" : "border-muted-foreground"
                            )}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                            </div>
                        );
                    }

                    if (compareMode || (!isTest && (isSubmitted || showAnswer))) {
                        containerClass = "cursor-default border-border opacity-60"; // Default dim

                        if (showAnswer) {
                            if (isCorrect) {
                                containerClass = "border-success bg-success/10 opacity-100";
                                textClass = "text-success font-medium";
                                icon = <CheckCircle2 className="w-5 h-5 text-success" />;
                            }
                        } else if (isSubmitted) {
                            if (isSelected && isCorrect) {
                                containerClass = "border-success bg-success/10 opacity-100";
                                textClass = "text-success font-medium";
                                icon = <CheckCircle2 className="w-5 h-5 text-success" />;
                            } else if (isSelected && !isCorrect) {
                                containerClass = "border-destructive bg-destructive/10 opacity-100";
                                textClass = "text-destructive font-medium";
                                icon = <XCircle className="w-5 h-5 text-destructive" />;
                            } else if (!isSelected && isCorrect) {
                                containerClass = "border-success border-dashed opacity-80";
                                textClass = "text-success";
                                icon = <CheckCircle2 className="w-5 h-5 text-success opacity-50" />;
                            }
                        }
                    } else {
                        // Interactive mode (Practice & Test)
                        if (isSelected) {
                            containerClass = "border-primary bg-primary/5 hover:bg-primary/10";
                        }
                    }

                    return (
                        <div
                            key={option.id}
                            onClick={() => handleSelect(option.id)}
                            className={cn(
                                "flex items-center p-3 rounded-md border transition-all",
                                containerClass
                            )}
                        >
                            <div className="mr-3 flex items-center justify-center shrink-0">
                                {icon}
                            </div>
                            <span className={cn("flex-1 select-none", textClass)}>
                                <LatexText text={option.text} />
                            </span>
                        </div>
                    );
                })}
            </div>

            {!isTest && (
                <>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        {isMulti && !isSubmitted ? (
                            <Button onClick={handleSubmit}>
                                <Send className="w-4 h-4 mr-2" /> Submit
                            </Button>
                        ) : (isSubmitted || currentSelection.length > 0 || showAnswer || visibleHints > 0 || showExplanation) ? (
                            <Button variant="outline" onClick={handleReset}>
                                <RotateCcw className="w-4 h-4 mr-2" /> Reset
                            </Button>
                        ) : null}

                        <Button
                            variant="ghost"
                            onClick={handleToggleShowAnswer}
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
