import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { type Space } from '@/types/domain';
import { useSpaceStore } from '@/store/spaceStore';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { DynamicIcon, getDeterministicColor } from '@/components/UI/DynamicIcon';
import { TruncatedText } from '@/components/common/TruncatedText';

export default function SpaceList() {
  const navigate = useNavigate();
  const { spaces, isLoading, fetchSpaces, createSpace, updateSpace, deleteSpace } = useSpaceStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);

  // Form states
  const [formData, setFormData] = useState({ name: '', description: '' });
  const createDescriptionRef = useRef<HTMLTextAreaElement>(null);

  const editDescriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const handleCreate = async () => {
    try {
      await createSpace(formData);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!currentSpace) return;
    try {
      await updateSpace(currentSpace._id, formData);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!currentSpace) return;
    try {
      await deleteSpace(currentSpace._id);
      closeModals();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '', description: '' });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (space: Space, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSpace(space);
    setFormData({ name: space.name, description: space.description || '' });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (space: Space, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSpace(space);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setCurrentSpace(null);
  };

  if (isLoading && spaces.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Fixed Header */}
      <div className="flex-none border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container mx-auto p-6 md:p-8 max-w-7xl flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">My Spaces</h1>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Create Space
          </Button>
        </div>
      </div>

      {/* Scrollable Grid Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
        <div className="container mx-auto max-w-7xl">
          {spaces.length === 0 ? (
            <EmptyState
              title="No spaces found"
              description="Create your first space to start organizing content."
              action={<Button onClick={openCreateModal}>Create Space</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {spaces.map((space) => (
                <Card
                  key={space._id}
                  onClick={() => navigate(`/spaces/${space.slug}/library`)}
                  className="group relative flex flex-col justify-between h-56 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer p-6"
                >
                  <div className="flex flex-col h-full min-w-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${getDeterministicColor(space._id)}`}>
                        <DynamicIcon name={space.icon} className="h-6 w-6" />
                      </div>
                      <div className="relative">
                        {/* Default View */}
                        <span className="text-xs font-medium px-2.5 py-1.5 rounded-full bg-secondary text-secondary-foreground inline-block group-hover:opacity-0 transition-opacity duration-200">
                          {space.subjectCount || 0} Subjects
                        </span>

                        {/* Hover View */}
                        <div className="absolute top-0 right-0 flex items-center bg-secondary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm border border-black/5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-8 rounded-l-full rounded-r-none hover:bg-black/5"
                            onClick={(e) => openEditModal(space, e)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <div className="w-px h-3 bg-black/10" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-8 rounded-r-full rounded-l-none text-destructive hover:text-destructive hover:bg-red-50"
                            onClick={(e) => openDeleteModal(space, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <TruncatedText
                        as="h3"
                        className="text-xl font-semibold mb-2 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text"
                      >
                        {space.name}
                      </TruncatedText>
                      <TruncatedText
                        as="p"
                        lines={3}
                        className="text-sm text-muted-foreground leading-relaxed"
                        title={space.description || 'No description provided.'}
                      >
                        {space.description || 'No description provided.'}
                      </TruncatedText>
                    </div>
                  </div>
                </Card>
              ))}

              <button
                onClick={openCreateModal}
                className="group relative flex flex-col items-center justify-center h-56 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50 rounded-xl transition-all cursor-pointer p-6"
              >
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <span className="font-semibold text-foreground">Add New Space</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Create New Space"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Space'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <div className="flex gap-2">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="e.g. Mathematics"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createDescriptionRef.current?.focus();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              ref={createDescriptionRef}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Optional description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        title="Edit Space"
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
            <label className="text-sm font-medium">Name</label>
            <div className="flex gap-2">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    editDescriptionRef.current?.focus();
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              ref={editDescriptionRef}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleUpdate();
                }
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        title="Delete Space"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Space'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete "{currentSpace?.name}"? All content inside will be permanently removed.
        </p>
      </Modal>
    </div>
  );
}
