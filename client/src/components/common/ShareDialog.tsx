import { useState, useEffect } from 'react';
import { Copy, Check, Link, Mail, X, Loader2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import {
  grantAccess,
  listPermissions,
  listShareLinks,
  revokeAccess,
  createShareLink,
  deactivateShareLink,
} from '@/lib/permissions';
import type { ResourceType, Permission, ShareLink as ShareLinkType } from '@/types/permissions';
import toast from 'react-hot-toast';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceTitle?: string;
}

export function ShareDialog({ isOpen, onClose, resourceType, resourceId, resourceTitle }: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLinkType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, resourceType, resourceId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [perms, links] = await Promise.all([
        listPermissions(resourceType, resourceId),
        listShareLinks(resourceType, resourceId).catch(() => []),
      ]);
      setPermissions(perms);
      setShareLinks(links);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    setIsSending(true);
    try {
      await grantAccess({ resourceType, resourceId, email: email.trim() });
      toast.success('Access granted!');
      setEmail('');
      loadData();
    } catch {
      toast.error('Failed to grant access.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRevoke = async (permissionId: string) => {
    try {
      await revokeAccess(permissionId);
      toast.success('Access revoked.');
      loadData();
    } catch {
      toast.error('Failed to revoke access.');
    }
  };

  const handleCreateLink = async () => {
    setIsCreatingLink(true);
    try {
      const link = await createShareLink({ resourceType, resourceId });
      setShareLinks(prev => [...prev, link]);
      toast.success('Share link created!');
    } catch {
      toast.error('Failed to create share link.');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleDeactivateLink = async (linkId: string) => {
    try {
      await deactivateShareLink(linkId);
      setShareLinks(prev => prev.filter(l => l._id !== linkId));
      toast.success('Link deactivated.');
    } catch {
      toast.error('Failed to deactivate link.');
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error('Failed to copy.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share ${resourceType}${resourceTitle ? `: ${resourceTitle}` : ''}`}
      footer={null}
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Invite by Email */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Invite by Email
            </h3>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button onClick={handleInvite} disabled={isSending || !email.trim()}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
              </Button>
            </div>
          </div>

          {/* Share Link */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Link className="h-3.5 w-3.5" />
              Share Link
            </h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={handleCreateLink} disabled={isCreatingLink}>
                {isCreatingLink ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link className="h-4 w-4 mr-1" />}
                Create Share Link
              </Button>
              {shareLinks.length > 0 && (
                <div className="space-y-2 mt-2">
                  {shareLinks.map((link, idx) => (
                    <div key={link._id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border text-sm">
                      <span className="flex-1 truncate font-mono text-xs">{link.url || `${window.location.origin}/shared/${link.hash}`}</span>
                      <button
                        onClick={() => copyToClipboard(link.url || `${window.location.origin}/shared/${link.hash}`, idx)}
                        className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeactivateLink(link._id)}
                        className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current Permissions */}
          {permissions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">People with Access</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {permissions.map((perm) => (
                  <div key={perm._id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{perm.userId?.name || perm.email || 'Unknown'}</p>
                      {perm.userId?.email && perm.userId.name && (
                        <p className="text-xs text-muted-foreground truncate">{perm.userId.email}</p>
                      )}
                      <span className={`text-[10px] font-medium uppercase ${perm.status === 'active' ? 'text-green-600' : perm.status === 'pending' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {perm.status}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRevoke(perm._id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
