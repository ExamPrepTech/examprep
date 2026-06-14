import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { NoteBlock as NoteBlockType } from '@/types/domain';
import { Card } from '@/components/common/Card';
import { BlockFooter } from '@/components/content-blocks/BlockFooter';
import { LatexText } from '@/components/common/LatexText';
import { QuestionImage } from '@/components/common/QuestionImage';

interface NoteBlockProps {
  block: NoteBlockType;
  isTest?: boolean;
}

export function NoteBlock({ block, isTest = false }: NoteBlockProps) {
  const [visibleHints, setVisibleHints] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <Card className={cn("transition-shadow", isTest ? "shadow-none border-0 p-0" : "hover:shadow-md")}>
      <div className="prose dark:prose-invert max-w-none text-foreground">
        <div className="whitespace-pre-wrap"><LatexText text={block.content || ''} /></div>
      </div>
      <QuestionImage url={block.imageUrl} />
      {!isTest && (
        <BlockFooter 
          explanation={block.explanation} 
          notes={block.notes} 
          hints={block.hints} 
          visibleHints={visibleHints}
          onNextHint={() => setVisibleHints(prev => prev + 1)}
          showExplanation={showExplanation}
          onToggleExplanation={() => setShowExplanation(!showExplanation)}
        />
      )}
    </Card>
  );
}
