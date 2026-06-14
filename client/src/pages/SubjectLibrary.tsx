import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { type Subject } from '@/types/domain';
import { useContentStore } from '@/store/contentStore';
import { useSpaceStore } from '@/store/spaceStore';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DynamicIcon, getDeterministicColor } from '@/components/UI/DynamicIcon';
import { TruncatedText } from '@/components/common/TruncatedText';

export default function SubjectLibrary() {
  const { spaceSlug } = useParams();
  const navigate = useNavigate();

  // Stores
  const { currentSpace, fetchSpace } = useSpaceStore();
  const { subjects, isLoading, fetchSubjects, createSubject, updateSubject, deleteSubject, setCurrentSubject } = useContentStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetSubject, setTargetSubject] = useState<Subject | null>(null);

  const [isCreating, setIsCreating] = useState(false);



  const [formData, setFormData] = useState({ title: '' });


  useEffect(() => {
    if (spaceSlug) {
      fetchSpace(spaceSlug);
      fetchSubjects(spaceSlug);
    }
  }, [spaceSlug, fetchSpace, fetchSubjects]);

  const handleCreate = async () => {
    if (!spaceSlug) return;
    setIsCreating(true);
    try {
      await createSubject(spaceSlug, formData.title);
      closeModals();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!targetSubject) return;
    try {
      await updateSubject(targetSubject._id, formData.title);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!targetSubject) return;
    try {
      await deleteSubject(targetSubject._id);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setFormData({ title: '' });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetSubject(subject);
    setFormData({ title: subject.title });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetSubject(subject);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setTargetSubject(null);
  };

  const handleSubjectClick = (subject: Subject) => {
    setCurrentSubject(subject);
    navigate(`/spaces/${spaceSlug}/${subject.slug}`);
  };

  if (isLoading && subjects.length === 0) {
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
                { label: currentSpace?.name || <div className="h-4 w-24 bg-muted animate-pulse rounded" /> }
              ]}
            />
          </div>

          <div className="flex items-center justify-between mb-8">
            <div className="flex-1 min-w-0 mr-4">
              <TruncatedText as="h1" className="text-3xl font-bold tracking-tight" title={currentSpace?.name ? `${currentSpace.name} Library` : 'Library'}>
                {currentSpace?.name ? `${currentSpace.name} Library` : 'Library'}
              </TruncatedText>
            </div>
            <Button onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="container mx-auto max-w-7xl">
          {subjects.length === 0 ? (
            <EmptyState
              title="No subjects yet"
              description="Create a subject to start adding topics."
              action={<Button onClick={openCreateModal}>Add Subject</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {subjects.map((subject) => (
                <div
                  key={subject._id}
                  onClick={() => handleSubjectClick(subject)}
                  className="group relative flex flex-col justify-between p-6 rounded-xl border border-border bg-card hover:shadow-md cursor-pointer transition-all hover:border-primary/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1 min-w-0 mr-4">
                      <div className={`p-3 rounded-xl ${getDeterministicColor(subject._id)} shrink-0`}>
                        <DynamicIcon name={subject.icon || 'Book'} className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <TruncatedText as="h3" className="text-xl font-semibold mb-1" lines={1} title={subject.title}>
                          {subject.title}
                        </TruncatedText>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            {subject.topicCount || 0} Topics
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {subject.questionCount || 0} Questions
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <div className="flex items-center bg-secondary/50 rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => openEditModal(subject, e)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-4 bg-border" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => openDeleteModal(subject, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Progress bar removed as per request "here no need of that progress" */}
                </div>
              ))}
            </div>
          )
          }

          {/* Create/Edit Modal Reuse structure */}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Add New Subject"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Subject'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <div className="flex gap-2">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="e.g. Algebra"
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
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        title="Edit Subject"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <div className="flex gap-2">
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
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        title="Delete Subject"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Subject'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete "{targetSubject?.title}"?
        </p>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete "{targetSubject?.title}"?
        </p>
      </Modal>

    </div >
  );
}
