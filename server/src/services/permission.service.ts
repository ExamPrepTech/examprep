import Permission, {
  type IPermission,
  type ResourceType,
} from '@/models/Permission.ts';
import Space from '@/models/Space.ts';
import Subject from '@/models/Subject.ts';
import Topic from '@/models/Topic.ts';
import ContentBlock from '@/models/ContentBlock.ts';
import Test from '@/models/Test.ts';
import User from '@/models/User.ts';
import { mailService } from '@/services/mail/mail.service.ts';
import { ENV } from '@/config/environment.ts';

async function resolveParent(
  resourceType: ResourceType,
  resourceId: string
): Promise<{ type: ResourceType; id: string } | null> {
  switch (resourceType) {
    case 'contentBlock': {
      const block = await ContentBlock.findById(resourceId, 'topicId');
      if (!block) return null;
      return { type: 'topic', id: block.topicId.toString() };
    }
    case 'topic': {
      const topic = await Topic.findById(resourceId, 'subjectId');
      if (!topic) return null;
      return { type: 'subject', id: topic.subjectId.toString() };
    }
    case 'subject': {
      const subject = await Subject.findById(resourceId, 'spaceId');
      if (!subject) return null;
      return { type: 'space', id: subject.spaceId.toString() };
    }
    case 'space':
    case 'test':
      return null;
    default:
      return null;
  }
}

async function getResourceOwner(
  resourceType: ResourceType,
  resourceId: string
): Promise<string | null> {
  const models: Record<ResourceType, any> = {
    space: Space,
    subject: Subject,
    topic: Topic,
    contentBlock: ContentBlock,
    test: Test,
  };
  const Model = models[resourceType];
  if (!Model) return null;
  const doc = await Model.findById(resourceId, 'userId');
  return doc?.userId?.toString() ?? null;
}

export class PermissionService {

  static async hasAccess(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<boolean> {
    const ownerId = await getResourceOwner(resourceType, resourceId);
    if (ownerId === userId) return true;

    const direct = await Permission.findOne({
      resourceType,
      resourceId,
      userId,
      status: 'active',
    });
    if (direct) return true;

    const parent = await resolveParent(resourceType, resourceId);
    if (parent) {
      return PermissionService.hasAccess(userId, parent.type, parent.id);
    }

    return false;
  }

  static async grant(params: {
    resourceType: ResourceType;
    resourceId: string;
    invitedBy: string;
    userId?: string;
    email?: string;
  }): Promise<IPermission> {
    const { resourceType, resourceId, invitedBy, userId, email } = params;

    let targetUserId = userId;
    let targetEmail = email;

    if (!targetUserId && targetEmail) {
      const existingUser = await User.findOne({ email: targetEmail });
      if (existingUser) {
        targetUserId = existingUser._id.toString();
      }
    }

    const ownerId = await getResourceOwner(resourceType, resourceId);
    if (ownerId !== invitedBy) {
      throw new Error('Only the resource owner can share content');
    }

    if (targetUserId) {
      const existing = await Permission.findOne({
        resourceType,
        resourceId,
        userId: targetUserId,
        status: { $ne: 'revoked' },
      });
      if (existing) {
        throw new Error('User already has access to this resource');
      }
    }

    const permissionData: Record<string, any> = {
      resourceType,
      resourceId,
      grantType: 'invite',
      invitedBy,
      status: targetUserId ? 'active' : 'pending',
    };
    if (targetUserId) permissionData.userId = targetUserId;
    if (targetEmail) permissionData.email = targetEmail;
    const permission = await (Permission.create as any)(permissionData) as IPermission;

    if (targetEmail) {
      const resourceName = await PermissionService.getResourceName(resourceType, resourceId);
      await mailService.send({
        to: targetEmail,
        subject: `Content shared with you: "${resourceName}"`,
        html: `<p>Content has been shared with you on Arena.</p>
               <p><a href="${ENV.CLIENT_URL}/shared-with-me">View shared content</a></p>`,
      });
    }

    return permission;
  }

  static async revoke(permissionId: string, revokedBy: string): Promise<IPermission | null> {
    const permission = await Permission.findById(permissionId);
    if (!permission) throw new Error('Permission not found');

    const ownerId = await getResourceOwner(
      permission.resourceType,
      permission.resourceId.toString()
    );
    if (ownerId !== revokedBy) {
      throw new Error('Only the resource owner can revoke access');
    }

    permission.status = 'revoked';
    return await permission.save();
  }

  static async listForResource(
    resourceType: ResourceType,
    resourceId: string,
    requestedBy: string
  ): Promise<IPermission[]> {
    const ownerId = await getResourceOwner(resourceType, resourceId);
    if (ownerId !== requestedBy) {
      throw new Error('Only the resource owner can view permissions');
    }

    return await Permission.find({
      resourceType,
      resourceId,
      status: { $ne: 'revoked' },
    })
      .populate('userId', 'name email avatar')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });
  }

  static async getSharedResourceIds(
    userId: string,
    resourceType: ResourceType
  ): Promise<string[]> {
    const permissions = await Permission.find({
      userId,
      resourceType,
      status: 'active',
    }, 'resourceId');
    return permissions.map(p => p.resourceId.toString());
  }

  static async acceptPendingInvites(email: string, userId: string): Promise<number> {
    const result = await Permission.updateMany(
      { email, status: 'pending', userId: { $exists: false } },
      { $set: { userId, status: 'active', acceptedAt: new Date() } }
    );
    return result.modifiedCount;
  }

  private static async getResourceName(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<string> {
    const models: Record<ResourceType, any> = {
      space: Space,
      subject: Subject,
      topic: Topic,
      contentBlock: ContentBlock,
      test: Test,
    };
    const Model = models[resourceType];
    if (!Model) return 'Unknown';
    const doc = await Model.findById(resourceId, 'name title question');
    if (!doc) return 'Unknown';
    return doc.name || doc.title || doc.question || resourceId;
  }
}
