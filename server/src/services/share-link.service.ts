import ShareLink, { type IShareLink, type ResourceType } from '@/models/ShareLink.ts';
import Permission from '@/models/Permission.ts';

export class ShareLinkService {

  static async create(params: {
    resourceType: ResourceType;
    resourceId: string;
    createdBy: string;
    expiresAt?: Date;
    maxUses?: number;
  }): Promise<IShareLink> {
    const { resourceType, resourceId, createdBy, expiresAt, maxUses } = params;

    const Space = (await import('@/models/Space.ts')).default;
    const Subject = (await import('@/models/Subject.ts')).default;
    const Topic = (await import('@/models/Topic.ts')).default;
    const ContentBlock = (await import('@/models/ContentBlock.ts')).default;
    const Test = (await import('@/models/Test.ts')).default;

    const models: Record<string, any> = {
      space: Space, subject: Subject, topic: Topic, contentBlock: ContentBlock, test: Test,
    };
    const Model = models[resourceType];
    const doc = await Model.findById(resourceId, 'userId');
    if (!doc || doc.userId.toString() !== createdBy) {
      throw new Error('Only the resource owner can create share links');
    }

    const linkData: Record<string, any> = {
      resourceType,
      resourceId,
      createdBy,
    };
    if (expiresAt) linkData.expiresAt = expiresAt;
    if (maxUses !== undefined) linkData.maxUses = maxUses;
    const link = await (ShareLink.create as any)(linkData) as IShareLink;

    return link;
  }

  static async resolve(hash: string): Promise<{
    resourceType: ResourceType;
    resourceId: string;
  }> {
    const link = await ShareLink.findOne({ hash, isActive: true });
    if (!link) throw new Error('Share link not found or deactivated');

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new Error('Share link has expired');
    }

    if (link.maxUses && link.useCount >= link.maxUses) {
      throw new Error('Share link has reached maximum uses');
    }

    link.useCount += 1;
    if (link.maxUses && link.useCount >= link.maxUses) {
      link.isActive = false;
    }
    await link.save();

    return {
      resourceType: link.resourceType,
      resourceId: link.resourceId.toString(),
    };
  }

  static async redeem(hash: string, userId: string): Promise<void> {
    const { resourceType, resourceId } = await ShareLinkService.resolve(hash);

    const PermissionService = (await import('@/services/permission.service.ts')).PermissionService;
    const hasAccess = await PermissionService.hasAccess(userId, resourceType, resourceId);
    if (hasAccess) return;

    await Permission.findOneAndUpdate(
      { resourceType, resourceId, userId, grantType: 'link' },
      {
        $set: {
          status: 'active',
          grantType: 'link',
          linkHash: hash,
        },
        $setOnInsert: {
          invitedBy: userId,
        },
      },
      { upsert: true }
    );
  }

  static async listForResource(
    resourceType: ResourceType,
    resourceId: string,
    requestedBy: string
  ): Promise<IShareLink[]> {
    const Space = (await import('@/models/Space.ts')).default;
    const Subject = (await import('@/models/Subject.ts')).default;
    const Topic = (await import('@/models/Topic.ts')).default;
    const ContentBlock = (await import('@/models/ContentBlock.ts')).default;
    const Test = (await import('@/models/Test.ts')).default;
    const models: Record<string, any> = {
      space: Space, subject: Subject, topic: Topic, contentBlock: ContentBlock, test: Test,
    };
    const Model = models[resourceType];
    const doc = await Model.findById(resourceId, 'userId');
    if (!doc || doc.userId.toString() !== requestedBy) {
      throw new Error('Only the resource owner can view share links');
    }

    return await ShareLink.find({ resourceType, resourceId, isActive: true })
      .sort({ createdAt: -1 });
  }

  static async deactivate(linkId: string, userId: string): Promise<IShareLink | null> {
    const link = await ShareLink.findById(linkId);
    if (!link) throw new Error('Share link not found');

    const Space = (await import('@/models/Space.ts')).default;
    const Subject = (await import('@/models/Subject.ts')).default;
    const Topic = (await import('@/models/Topic.ts')).default;
    const ContentBlock = (await import('@/models/ContentBlock.ts')).default;
    const Test = (await import('@/models/Test.ts')).default;
    const models: Record<string, any> = {
      space: Space, subject: Subject, topic: Topic, contentBlock: ContentBlock, test: Test,
    };
    const Model = models[link.resourceType];
    const doc = await Model.findById(link.resourceId, 'userId');
    if (!doc || doc.userId.toString() !== userId) {
      throw new Error('Only the resource owner can deactivate share links');
    }

    link.isActive = false;
    return await link.save();
  }
}
