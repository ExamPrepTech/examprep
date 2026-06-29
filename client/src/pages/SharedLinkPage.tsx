import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Share2, Check } from 'lucide-react';
import { resolveShareLink, redeemShareLink } from '@/lib/permissions';
import { Button } from '@/components/common/Button';

interface ResolvedResource {
  resourceType: string;
  resourceId: string;
  resource: Record<string, any>;
  spaceSlug: string | null;
  subjectSlug: string | null;
}

export default function SharedLinkPage() {
  const { hash } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ResolvedResource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    if (!hash) return;
    resolveShareLink(hash)
      .then(setData)
      .catch((err) => setError(err?.response?.data?.message || err.message || 'Invalid or expired link'))
      .finally(() => setIsLoading(false));
  }, [hash]);

  const handleAccept = async () => {
    if (!hash || !data) return;
    setIsRedeeming(true);
    try {
      await redeemShareLink(hash);

      const { resourceType, resource, spaceSlug, subjectSlug } = data;
      if (resourceType === 'space' && resource?.slug) {
        navigate(`/spaces/${resource.slug}/library`);
      } else if (resourceType === 'subject' && spaceSlug && resource?.slug) {
        navigate(`/spaces/${spaceSlug}/${resource.slug}`);
      } else if (resourceType === 'topic' && spaceSlug && subjectSlug && resource?.slug) {
        navigate(`/spaces/${spaceSlug}/${subjectSlug}/${resource.slug}`);
      } else {
        navigate('/shared-with-me');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to accept share');
    } finally {
      setIsRedeeming(false);
    }
  };

  const resourceLabel = data?.resourceType ? data.resourceType.charAt(0).toUpperCase() + data.resourceType.slice(1) : '';
  const resourceName = data?.resource?.name || data?.resource?.title || '';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Resolving shared link...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Share2 className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-center">Link Error</h1>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Share2 className="h-10 w-10 text-primary" />
      </div>
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-2">Content Shared With You</h1>
        <p className="text-lg text-foreground/80">
          {resourceLabel}: <span className="font-semibold">{resourceName || 'Untitled'}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Accept to add this {data?.resourceType} to your library and start studying.
        </p>
      </div>
      <div className="flex gap-3 mt-2">
        <Button variant="secondary" onClick={() => navigate('/')}>Cancel</Button>
        <Button onClick={handleAccept} disabled={isRedeeming}>
          {isRedeeming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Accept & View
        </Button>
      </div>
    </div>
  );
}
