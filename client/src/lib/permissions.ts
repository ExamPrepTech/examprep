import api from '@/lib/api';
import type {
  Permission,
  ShareLink,
  SharedResourcesGrouped,
  ResourceType,
} from '@/types/permissions';

const BASE = '';

export async function grantAccess(params: {
  resourceType: ResourceType;
  resourceId: string;
  email?: string;
  userId?: string;
}): Promise<Permission> {
  const { data } = await api.post(`${BASE}/permissions`, params);
  return data;
}

export async function listPermissions(
  resourceType: ResourceType,
  resourceId: string
): Promise<Permission[]> {
  const { data } = await api.get(`${BASE}/permissions`, {
    params: { resourceType, resourceId },
  });
  return data;
}

export async function revokeAccess(permissionId: string): Promise<void> {
  await api.delete(`${BASE}/permissions/${permissionId}`);
}

export async function createShareLink(params: {
  resourceType: ResourceType;
  resourceId: string;
  expiresAt?: string;
  maxUses?: number;
}): Promise<ShareLink> {
  const { data } = await api.post(`${BASE}/share-links`, params);
  return data;
}

export async function listShareLinks(
  resourceType: ResourceType,
  resourceId: string
): Promise<ShareLink[]> {
  const { data } = await api.get(`${BASE}/share-links`, {
    params: { resourceType, resourceId },
  });
  return data;
}

export async function deactivateShareLink(linkId: string): Promise<void> {
  await api.delete(`${BASE}/share-links/${linkId}`);
}

export async function importSpace(spaceId: string): Promise<any> {
  const { data } = await api.post(`${BASE}/import/space/${spaceId}`);
  return data;
}

export async function importSubject(subjectId: string, targetSpaceId: string): Promise<any> {
  const { data } = await api.post(`${BASE}/import/subject/${subjectId}`, { targetSpaceId });
  return data;
}

export async function importTopic(topicId: string, targetSubjectId: string): Promise<any> {
  const { data } = await api.post(`${BASE}/import/topic/${topicId}`, { targetSubjectId });
  return data;
}

export async function takeSharedTest(testId: string): Promise<any> {
  const { data } = await api.post(`${BASE}/import/test/${testId}/take`);
  return data;
}

export async function getSharedResources(): Promise<SharedResourcesGrouped> {
  const { data } = await api.get(`${BASE}/me/shared-resources`);
  return data;
}

export async function getSharedTest(testId: string): Promise<any> {
  const { data } = await api.get(`${BASE}/shared/tests/${testId}`);
  return data;
}

export async function resolveShareLink(hash: string): Promise<any> {
  const { data } = await api.get(`${BASE}/shared/${hash}`);
  return data;
}

export async function redeemShareLink(hash: string): Promise<void> {
  await api.post(`${BASE}/shared/${hash}/redeem`);
}
