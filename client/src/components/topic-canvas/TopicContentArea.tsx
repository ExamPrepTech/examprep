import { useState } from 'react';
import { Search, Pencil, Trash2, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import type { ContentBlock, ContentBlockType } from '@/types/domain';
import { ContentBlockDisplay } from '@/components/content-blocks/ContentBlockDisplay';

interface TopicContentAreaProps {
  selectedBlock: ContentBlock | undefined;
  onEdit: (block: ContentBlock) => void;
  onDelete: (id: string) => void;
}

export function TopicContentArea({ selectedBlock, onEdit, onDelete }: TopicContentAreaProps) {
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  
  const getBlockTypeLabel = (kind: ContentBlockType) => {
    switch(kind) {
      case 'note': return 'NOTE';
      case 'single_select_mcq': return 'MCQ';
      case 'multi_select_mcq': return 'MCQ';
      case 'fill_in_the_blank': return 'FILL';
      default: return 'UNK';
    }
  };

  const getBlockColorClasses = (kind: ContentBlockType) => {
    switch(kind) {
      case 'note': return 'bg-block-note-bg text-block-note-text border-block-note-border';
      case 'single_select_mcq': 
      case 'multi_select_mcq': return 'bg-block-mcq-bg text-block-mcq-text border-block-mcq-border';
      case 'fill_in_the_blank': return 'bg-block-fact-bg text-block-fact-text border-block-fact-border';
      default: return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  if (!selectedBlock) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 bg-background h-full text-muted-foreground p-8">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-8 w-8 opacity-50" />
        </div>
        <p>Select a block from the sidebar to view details.</p>
      </div>
    );
  }

  const visibleTags = selectedBlock.tags?.slice(0, 4) || [];
  const hiddenCount = (selectedBlock.tags?.length || 0) - visibleTags.length;

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 bg-background h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8 md:p-12 mb-20">
            {/* Block Header actions */}
            <div className="mb-8 pb-6 border-b space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border shadow-sm", getBlockColorClasses(selectedBlock.kind))}>
                      {getBlockTypeLabel(selectedBlock.kind)} BLOCK
                    </span>
                    
                    <span className="text-sm text-muted-foreground">
                      Last updated {selectedBlock.updatedAt ? new Date(selectedBlock.updatedAt).toLocaleDateString() : 'recently'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(selectedBlock)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(selectedBlock._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedBlock.tags && selectedBlock.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 items-center">
                        {visibleTags.map(t => (
                            <span key={t} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-transparent transition-colors hover:bg-secondary/80">
                                <Tag className="h-3 w-3 mr-1.5 opacity-70" />
                                {t}
                            </span>
                        ))}
                        {hiddenCount > 0 && (
                          <button 
                            onClick={() => setIsTagsModalOpen(true)}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-transparent hover:bg-muted/80 hover:text-foreground transition-colors"
                          >
                            +{hiddenCount} more
                          </button>
                        )}
                    </div>
                )}
            </div>

            <div className="prose prose-slate max-w-none dark:prose-invert">
                <ContentBlockDisplay key={selectedBlock._id} block={selectedBlock} />
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        title="All Tags"
        footer={<Button onClick={() => setIsTagsModalOpen(false)}>Close</Button>}
      >
        <div className="flex flex-wrap gap-2 p-1">
          {selectedBlock.tags?.map(t => (
            <span key={t} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-secondary text-secondary-foreground border border-transparent">
               <Tag className="h-3 w-3 mr-2 opacity-70" />
               {t}
            </span>
          ))}
        </div>
      </Modal>
    </>
  );
}


