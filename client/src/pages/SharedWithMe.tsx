import { useState, useEffect } from 'react';
import { getSharedResources, importSpace } from '@/lib/permissions';
import { Button } from '@/components/UI/Button';
import { Card } from '@/components/UI/Card';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ImportModal from '@/components/common/ImportModal';
import type { SharedResourcesGrouped, SharedResource } from '@/types/permissions';

function SharedWithMe() {
  const [resources, setResources] = useState<SharedResourcesGrouped | null>(null);
  const [loading, setLoading] = useState(true);
  const [importModal, setImportModal] = useState<{ type: 'subject' | 'topic'; id: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getSharedResources()
      .then(setResources)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleImport = async (type: string, id: string) => {
    try {
      if (type === 'space') {
        await importSpace(id);
        toast.success('Imported successfully!');
      } else if (type === 'subject') {
        setImportModal({ type: 'subject', id });
      } else if (type === 'topic') {
        setImportModal({ type: 'topic', id });
      }
    } catch {
      toast.error('Import failed');
    }
  };

  const handleView = (item: SharedResource, type: string) => {
    if (type === 'test') {
      navigate(`/shared/tests/${item.resourceId}`);
      return;
    }
    const slug = item.resource.slug;
    if (type === 'space') {
      navigate(`/spaces/${slug}/library`);
    } else if (type === 'subject' && item.spaceSlug && slug) {
      navigate(`/spaces/${item.spaceSlug}/${slug}`);
    } else if (type === 'topic' && item.spaceSlug && item.subjectSlug && slug) {
      navigate(`/spaces/${item.spaceSlug}/${item.subjectSlug}/${slug}`);
    } else {
      navigate('/shared-with-me');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Shared With Me</h1>

      {Object.entries(resources || {}).map(([type, items]) =>
        items.length > 0 ? (
          <section key={type} className="mb-8">
            <h2 className="text-lg font-semibold capitalize mb-3">{type}s</h2>
            <div className="space-y-2">
              {items.map((item: SharedResource) => (
                <Card.Row key={item.permissionId} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">
                      {item.resource.name || item.resource.title || 'Untitled'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Shared by {item.sharedBy.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleView(item, type)}>
                      View
                    </Button>
                    {type === 'test' ? (
                      <Button onClick={() => handleImport('test', item.resourceId)}>
                        Start Test
                      </Button>
                    ) : (
                      <Button onClick={() => handleImport(type, item.resourceId)}>
                        Import
                      </Button>
                    )}
                  </div>
                </Card.Row>
              ))}
            </div>
          </section>
        ) : null
      )}

      {Object.values(resources || {}).every(arr => arr.length === 0) && (
        <p className="text-gray-500">Nothing shared with you yet.</p>
      )}

      {importModal && (
        <ImportModal
          isOpen
          onClose={() => setImportModal(null)}
          resourceType={importModal.type}
          resourceId={importModal.id}
          onSuccess={() => {
            getSharedResources().then(setResources).catch(console.error);
          }}
        />
      )}
    </div>
  );
}

export default SharedWithMe;
