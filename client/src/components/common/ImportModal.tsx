import { useState, useEffect } from 'react';
import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import { importSubject, importTopic } from '@/lib/permissions';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2, ChevronRight, FolderOpen } from 'lucide-react';

interface Space {
  _id: string;
  name: string;
  slug: string;
}

interface Subject {
  _id: string;
  title: string;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'subject' | 'topic';
  resourceId: string;
  onSuccess: () => void;
}

export function ImportModal({ isOpen, onClose, resourceType, resourceId, onSuccess }: ImportModalProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSelectedSpaceId(null);
    setSubjects([]);
    loadSpaces();
  }, [isOpen]);

  const loadSpaces = async () => {
    setLoadingSpaces(true);
    try {
      const res = await api.get<Space[]>('/spaces');
      setSpaces(res.data);
    } catch {
      setError('Failed to load spaces');
    } finally {
      setLoadingSpaces(false);
    }
  };

  const loadSubjects = async (spaceId: string) => {
    setLoadingSubjects(true);
    try {
      const res = await api.get<Subject[]>(`/spaces/${spaceId}/subjects`);
      setSubjects(res.data);
    } catch {
      setError('Failed to load subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSpaceSelect = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    setError(null);
    if (resourceType === 'topic') {
      loadSubjects(spaceId);
    }
  };

  const handleSubjectSelect = async (subjectId: string) => {
    if (!selectedSpaceId) return;
    setImporting(true);
    setError(null);
    try {
      await importTopic(resourceId, subjectId);
      toast.success('Topic imported successfully!');
      onSuccess();
      onClose();
    } catch {
      setError('Import failed');
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleImportToSpace = async () => {
    if (!selectedSpaceId) return;
    setImporting(true);
    setError(null);
    try {
      await importSubject(resourceId, selectedSpaceId);
      toast.success('Subject imported successfully!');
      onSuccess();
      onClose();
    } catch {
      setError('Import failed');
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={`Import ${resourceType}`} width={480}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select a target {resourceType === 'subject' ? 'space' : 'space and subject'} to import into.
        </p>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2">
            {error}
          </div>
        )}

        {/* Space selection */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Target Space
          </label>
          {loadingSpaces ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading spaces...
            </div>
          ) : spaces.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No spaces found.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {spaces.map((space) => (
                <button
                  key={space._id}
                  type="button"
                  onClick={() => handleSpaceSelect(space._id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left rounded-lg border transition-colors ${
                    selectedSpaceId === space._id
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border hover:border-iron hover:bg-muted'
                  }`}
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-iron" />
                  <span className="truncate">{space.name}</span>
                  {resourceType === 'subject' && selectedSpaceId === space._id && (
                    <ChevronRight className="h-4 w-4 ml-auto shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject selection (for topic import) */}
        {resourceType === 'topic' && selectedSpaceId && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Target Subject
            </label>
            {loadingSubjects ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects...
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No subjects in this space.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {subjects.map((subject) => (
                  <button
                    key={subject._id}
                    type="button"
                    onClick={() => handleSubjectSelect(subject._id)}
                    disabled={importing}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left rounded-lg border border-border hover:border-iron hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <span className="truncate">{subject.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirm button for subject import */}
        {resourceType === 'subject' && selectedSpaceId && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleImportToSpace} isLoading={importing}>
              Import
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ImportModal;
