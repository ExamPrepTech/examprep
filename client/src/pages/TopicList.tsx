import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Loader2, Share2 } from 'lucide-react';

import { type Topic } from '@/types/domain';
import { useContentStore } from '@/store/contentStore';


import { useSpaceStore } from '@/store/spaceStore';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DynamicIcon, getDeterministicColor } from '@/components/UI/DynamicIcon';
import { IconPicker } from '@/components/UI/IconPicker';
import { TruncatedText } from '@/components/common/TruncatedText';
import { ShareDialog } from '@/components/common/ShareDialog';

export default function TopicList() {
  const { spaceSlug, subjectSlug } = useParams();
  const navigate = useNavigate();

  // Stores

  const { currentSpace, fetchSpace } = useSpaceStore();
  const {
    currentSubject,
    // setCurrentSubject, // No longer manually setting from list
    fetchSubject,
    topics,
    isLoading,
    fetchTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    setCurrentTopic
  } = useContentStore();


  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetTopic, setTargetTopic] = useState<Topic | null>(null);
  const [shareTopic, setShareTopic] = useState<Topic | null>(null);



  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({ title: '', icon: 'Hash' });

  // Initial load
  useEffect(() => {
    if (spaceSlug && subjectSlug) {
      if (!currentSpace || currentSpace.slug !== spaceSlug) fetchSpace(spaceSlug);

      // Fetch specific subject directly
      if (!currentSubject || currentSubject.slug !== subjectSlug) {
        fetchSubject(subjectSlug);
      }

      fetchTopics(subjectSlug);
    }
  }, [spaceSlug, subjectSlug, fetchSpace, fetchSubject, fetchTopics, currentSpace, currentSubject]);


  const handleCreate = async () => {
    if (!subjectSlug) return;
    setIsCreating(true);
    try {
      await createTopic(subjectSlug, formData.title, formData.icon);
      closeModals();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!targetTopic) return;
    try {
      await updateTopic(targetTopic._id, formData.title, formData.icon);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!targetTopic) return;
    try {
      await deleteTopic(targetTopic._id);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setFormData({ title: '', icon: 'Hash' });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetTopic(topic);
    setFormData({ title: topic.title, icon: topic.icon || 'Hash' });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetTopic(topic);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setTargetTopic(null);
  };

  const handleTopicClick = (topic: Topic) => {
    setCurrentTopic(topic);
    navigate(`/spaces/${spaceSlug}/${subjectSlug}/${topic.slug}`);
  };

  if (isLoading && topics.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-none bg-background z-10 px-8 pt-8 pb-0">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-6">
            <Breadcrumbs
              items={[
                { label: currentSpace?.name || <div className="h-4 w-24 bg-muted animate-pulse rounded" />, href: `/spaces/${spaceSlug}/library` },
                { label: currentSubject?.title || <div className="h-4 w-32 bg-muted animate-pulse rounded" /> }
              ]}
            />
          </div>

          <div className="flex items-center justify-between mb-8">
            <div className="flex-1 min-w-0 mr-4">
              <TruncatedText as="h1" className="text-3xl font-bold tracking-tight" title={currentSubject?.title}>
                {currentSubject?.title}
              </TruncatedText>
            </div>
            <div className="flex gap-2 shrink-0">
              {currentSpace?.isOwner !== false && (
                <Button onClick={openCreateModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Topic
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="container mx-auto max-w-7xl">
          {topics.length === 0 ? (
            <EmptyState
              title="No topics yet"
              description={currentSpace?.isOwner !== false ? "Create a topic to start adding content." : "No topics in this subject yet."}
              action={currentSpace?.isOwner !== false ? <Button onClick={openCreateModal}>Add Topic</Button> : undefined}
            />
          ) : (
            <div className="space-y-4">
              {topics.map((topic) => (
                <div
                  key={topic._id}
                  onClick={() => handleTopicClick(topic)}
                  className="group flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0 mr-4">
                    <div className={`h-10 w-10 rounded-md flex items-center justify-center text-lg font-bold shrink-0 ${getDeterministicColor(topic._id)}`}>
                      <DynamicIcon name={topic.icon || 'Hash'} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <TruncatedText as="h3" className="text-lg font-medium mb-1">
                        {topic.title}
                      </TruncatedText>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {topic.questionCount || 0} Questions
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentSpace?.isOwner !== false && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <div className="flex items-center bg-secondary/50 rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => openEditModal(topic, e)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-border" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); setShareTopic(topic); }}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-border" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => openDeleteModal(topic, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Create Modal */}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Add New Topic"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Topic'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="e.g. Linear Equations"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
            autoFocus
          />
        </div>
        <div className="mt-4">
          <IconPicker
            selected={formData.icon}
            onSelect={(icon) => setFormData({ ...formData, icon })}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        title="Edit Topic"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUpdate();
              }
            }}
          />
        </div>
        <div className="mt-4">
          <IconPicker
            selected={formData.icon}
            onSelect={(icon) => setFormData({ ...formData, icon })}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        title="Delete Topic"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Topic'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete "{targetTopic?.title}"?
        </p>
      </Modal>

      <ShareDialog
        isOpen={!!shareTopic}
        onClose={() => setShareTopic(null)}
        resourceType="topic"
        resourceId={shareTopic?._id || ''}
        resourceTitle={shareTopic?.title}
      />
    </div>
  );
}
