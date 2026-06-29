export type ResourceType = 'space' | 'subject' | 'topic' | 'contentBlock' | 'test';
export type GrantType = 'invite' | 'link';

export interface Permission {
  _id: string;
  resourceType: ResourceType;
  resourceId: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  email?: string;
  grantType: GrantType;
  invitedBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'active' | 'pending' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

export interface ShareLink {
  _id: string;
  resourceType: ResourceType;
  resourceId: string;
  hash: string;
  url: string;
  useCount: number;
  maxUses?: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SharedResource {
  permissionId: string;
  resourceId: string;
  resource: {
    _id: string;
    name?: string;
    title?: string;
    slug: string;
    question?: string;
  };
  spaceSlug?: string | null;
  subjectSlug?: string | null;
  sharedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  sharedAt: string;
}

export interface SharedResourcesGrouped {
  space: SharedResource[];
  subject: SharedResource[];
  topic: SharedResource[];
  contentBlock: SharedResource[];
  test: SharedResource[];
}
