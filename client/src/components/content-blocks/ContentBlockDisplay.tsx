import type { ContentBlock } from '@/types/domain';
import { NoteBlock } from '@/components/content-blocks/NoteBlock';
import { McqBlock } from '@/components/content-blocks/McqBlock';
import { FillInTheBlankBlock } from '@/components/content-blocks/FillInTheBlankBlock';

interface ContentBlockDisplayProps {
    block: ContentBlock;
    isTest?: boolean;
    value?: any;
    onChange?: (value: any) => void;
    onSubmit?: () => void;
    compareMode?: boolean;
    onShowAnswer?: () => void;
}

export function ContentBlockDisplay({ block, isTest = false, value, onChange, onSubmit, compareMode, onShowAnswer }: ContentBlockDisplayProps) {
    switch (block.kind) {
        case 'note':
            return <NoteBlock block={block} isTest={isTest} />;
        case 'single_select_mcq':
        case 'multi_select_mcq':
            return <McqBlock block={block} isTest={isTest} value={value} onChange={onChange} onSubmit={onSubmit} compareMode={compareMode} onShowAnswer={onShowAnswer} />;
        case 'fill_in_the_blank':
            return <FillInTheBlankBlock block={block} isTest={isTest} value={value} onChange={onChange} onSubmit={onSubmit} compareMode={compareMode} onShowAnswer={onShowAnswer} />;
        default:
            return (
                <div className="p-4 border border-dashed border-destructive rounded text-destructive bg-destructive/10">
                    Unknown block type: {(block as any).kind} <br/>
                    <pre className="text-xs mt-2 whitespace-pre-wrap">
                        {JSON.stringify(block, null, 2)}
                    </pre>
                </div>
            );
    }
}
