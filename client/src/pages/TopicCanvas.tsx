import { useState, useEffect, useMemo } from 'react';
import { PromptService } from '@/services/PromptService';
import { useParams } from 'react-router-dom';
import { type ContentBlock, type ContentBlockType } from '@/types/domain';
import { useContentStore } from '@/store/contentStore';
import { useSpaceStore } from '@/store/spaceStore';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { ContentBlockModal } from '@/components/content-blocks/ContentBlockModal';
import { TopicSidebar } from '@/components/topic-canvas/TopicSidebar';
import { TopicContentArea } from '@/components/topic-canvas/TopicContentArea';
import { MultiSelect } from '@/components/common/MultiSelect';
import { BulkUploadModal } from '@/components/content-blocks/BulkUploadModal';


export default function TopicCanvas() {
  const { spaceSlug, subjectSlug, topicSlug } = useParams();
  
  // Stores
  const { currentSpace, fetchSpace } = useSpaceStore();
  const { 
    currentSubject, 
    setCurrentSubject, 
    subjects, 
    fetchSubjects,
    currentTopic,
    setCurrentTopic,
    topics, 
    fetchTopics,
    blocks, 
    isLoading, 
    fetchBlocks, 
    addBlock, 
    updateBlock, 
    deleteBlock,
    hasMore
  } = useContentStore();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);


  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const [modalType, setModalType] = useState<ContentBlockType>('note');
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // UI State
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeTypeFilters, setActiveTypeFilters] = useState<ContentBlockType[]>([]);
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (spaceSlug && subjectSlug && topicSlug) {
      if (!currentSpace || currentSpace.slug !== spaceSlug) fetchSpace(spaceSlug);
      
      // Hierarchy resolution
      if (!currentSubject || currentSubject.slug !== subjectSlug) {
        if (subjects.length > 0) {
          const found = subjects.find(s => s.slug === subjectSlug);
            if (found) setCurrentSubject(found);
          else fetchSubjects(spaceSlug); 
        } else {
          fetchSubjects(spaceSlug);
        }
      }
      
      if (!currentTopic || currentTopic.slug !== topicSlug) {
           if (topics.length > 0) {
             const found = topics.find(t => t.slug === topicSlug);
               if (found) setCurrentTopic(found);
               else fetchTopics(subjectSlug);
           } else {
             fetchTopics(subjectSlug);
           }
      }
    }
  }, [spaceSlug, subjectSlug, topicSlug, fetchSpace, fetchSubjects, fetchTopics]); 

  // Backend Filter Effect - Debounced Search + Filters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (topicSlug) {
         fetchBlocks(topicSlug, {
           types: activeTypeFilters.length > 0 ? activeTypeFilters : undefined,
           tags: activeTagFilters.length > 0 ? activeTagFilters : undefined,
           search: searchQuery || undefined
         });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [topicSlug, activeTypeFilters, activeTagFilters, searchQuery, fetchBlocks]);


  // Update effect to catch hierarchy loads
  useEffect(() => {
    if (subjectSlug && (!currentSubject || currentSubject.slug !== subjectSlug) && subjects.length > 0) {
      const found = subjects.find(s => s.slug === subjectSlug);
          if (found) setCurrentSubject(found);
      }
    if (topicSlug && (!currentTopic || currentTopic.slug !== topicSlug) && topics.length > 0) {
      const found = topics.find(t => t.slug === topicSlug);
          if (found) setCurrentTopic(found);
      }
  }, [subjects, topics, subjectSlug, topicSlug, currentSubject, currentTopic, setCurrentSubject, setCurrentTopic]);

  // Extract all tags from current blocks
  const allTags = useMemo(() => Array.from(new Set(blocks.flatMap(b => b.tags || []))), [blocks]);
  
  // Auto-select first block if none selected
  useEffect(() => {
    if (!selectedBlockId && blocks.length > 0) {
      setSelectedBlockId(blocks[0]._id);
    } 
    // If selected block is no longer in list, select first visible
    else if (selectedBlockId && !blocks.some(b => b._id === selectedBlockId) && blocks.length > 0) {
      if (blocks.length > 0) setSelectedBlockId(blocks[0]._id);
      else setSelectedBlockId(null);
    }
  }, [blocks, selectedBlockId]);

  const handleAddBlockClick = (type: ContentBlockType | 'bulk') => {
    if (type === 'bulk') {
      setIsBulkModalOpen(true);
      return;
    }
    setModalType(type as ContentBlockType);
    setEditingBlock(null);
    setIsModalOpen(true);
  };


  const handleEditBlockClick = (block: ContentBlock) => {
    setModalType(block.kind);
    setEditingBlock(block);
    setIsModalOpen(true);
  };

  const handleSaveBlock = async (data: Partial<ContentBlock>) => {
    if (!topicSlug) return;
    try {
      if (editingBlock) {
        await updateBlock(editingBlock._id, data);
      } else {
        await addBlock(topicSlug, data.kind as ContentBlockType, data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const { bulkCreateBlocks } = useContentStore();

  const handleBulkUpload = async (blocks: Partial<ContentBlock>[]) => {
    if (!currentTopic) return;
    await bulkCreateBlocks(currentTopic._id, blocks);
  };


  const handleDeleteBlock = async (id: string) => {
    PromptService.confirm(
      'Are you sure you want to delete this block? This cannot be undone.',
      async () => {
        try {
          await deleteBlock(id);
          if (selectedBlockId === id) {
            setSelectedBlockId(null); 
          }
        } catch (err) {
          console.error(err);
          PromptService.error("Failed to delete block.");
        }
      },
      "Delete Block",
      "Delete",
      "Cancel"
    );
  };

  const selectedBlock = blocks.find(b => b._id === selectedBlockId);

  // Filter UI Data
  const blockTypes: { type: ContentBlockType; label: string }[] = [
    { type: 'note', label: 'Note' },
    { type: 'single_select_mcq', label: 'Single Choice' },
    { type: 'multi_select_mcq', label: 'Multi Choice' },
    { type: 'fill_in_the_blank', label: 'Fill in the Blank' },
  ];

  const handleLoadMore = () => {
    if (topicSlug) {
      fetchBlocks(topicSlug, {
        types: activeTypeFilters.length > 0 ? activeTypeFilters : undefined,
        tags: activeTagFilters.length > 0 ? activeTagFilters : undefined,
        search: searchQuery || undefined
      }, true); // Load More = true
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      <TopicSidebar
        spaceName={currentSpace?.name}
        subjectTitle={currentSubject?.title}
        topicTitle={currentTopic?.title}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isFilterActive={activeTypeFilters.length > 0 || activeTagFilters.length > 0}
        onOpenFilter={() => setIsFilterDialogOpen(true)}
        onAddBlock={handleAddBlockClick as any}
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        isLoading={isLoading}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
      />

      <TopicContentArea
        selectedBlock={selectedBlock}
        onEdit={handleEditBlockClick}
        onDelete={handleDeleteBlock}
      />

      <ContentBlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBlock}
        type={modalType}
        initialData={editingBlock || undefined}
      />

      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onUpload={handleBulkUpload}
        topicId={currentTopic?._id || ''}
      />


      
      {/* Filter Modal */}
      <Modal
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        title="Filter Content"
        footer={
           <>
              <Button variant="ghost" onClick={() => {
                 setActiveTypeFilters([]);
                 setActiveTagFilters([]);
              }}>Clear All</Button>
              <Button onClick={() => setIsFilterDialogOpen(false)}>Done</Button>
           </>
        }
      >
        <div className="space-y-6 p-1 min-h-[300px]"> 
           <MultiSelect
             label="Block Types"
             placeholder="Select types..."
             options={blockTypes.map(t => ({ label: t.label, value: t.type }))}
             selected={activeTypeFilters}
             onChange={(values) => setActiveTypeFilters(values as ContentBlockType[])}
           />

           {allTags.length > 0 && (
             <MultiSelect
               label="Tags"
               placeholder="Select tags..."
               options={allTags.map(tag => ({ label: tag, value: tag }))}
               selected={activeTagFilters}
               onChange={(values) => setActiveTagFilters(values)}
             />
           )}
        </div>
      </Modal>

    </div>
  );
}
