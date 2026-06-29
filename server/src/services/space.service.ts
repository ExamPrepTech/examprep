import Space, { type ISpace } from '@/models/Space.ts';
import Subject from '@/models/Subject.ts';
import Topic from '@/models/Topic.ts';
import ContentBlock from '@/models/ContentBlock.ts';
import ShareLink from '@/models/ShareLink.ts';
import Permission from '@/models/Permission.ts';
import User from '@/models/User.ts';
import { Types } from 'mongoose';
import { PermissionService } from '@/services/permission.service.ts';

export class SpaceService {

  static async create(userId: string, data: Partial<ISpace>): Promise<ISpace> {
    const space = new Space({ ...data, userId });
    return await space.save();
  }

  static async findAll(userId: string): Promise<any[]> {
    const sharedIds = await PermissionService.getSharedResourceIds(userId, 'space');
    const spaces = await Space.find({
      $or: [
        { userId },
        { _id: { $in: sharedIds } },
      ],
    }, '_id name description slug icon subjectCount userId').sort({ createdAt: -1 });

    const spaceIds = spaces.map(s => s._id);
    const agg = await Subject.aggregate([
      { $match: { spaceId: { $in: spaceIds } } },
      { 
        $group: { 
          _id: '$spaceId', 
          questionTotal: { $sum: '$questionCount' },
          subjectTotal: { $sum: 1 }
        } 
      }
    ]);

    const countMap = new Map(agg.map((a: any) => [a._id.toString(), a]));

    const enriched = await Promise.all(spaces.map(async (s) => {
      const stats = countMap.get((s._id as any).toString()) || { questionTotal: 0, subjectTotal: 0 };
      const isOwner = s.userId.toString() === userId;
      let ownerName: string | undefined;
      if (!isOwner) {
        const owner = await User.findById(s.userId, 'name').lean();
        if (owner) ownerName = (owner as any).name;
      }
      return {
        ...s.toObject(),
        questionCount: stats.questionTotal,
        subjectCount: stats.subjectTotal,
        isOwner,
        ownerName,
      };
    }));
    return enriched;
  }

  static async findOne(userId: string, identifier: string): Promise<any | null> {
    const query = Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { slug: identifier };
    const space = await Space.findOne(query, '_id name description slug icon userId');
    if (!space) return null;
    const hasAccess = await PermissionService.hasAccess(userId, 'space', space._id.toString());
    if (!hasAccess) return null;
    return {
      ...space.toObject(),
      isOwner: space.userId.toString() === userId,
    };
  }

  static async update(userId: string, spaceId: string, data: Partial<ISpace>): Promise<ISpace | null> {
    return await Space.findOneAndUpdate(
      { _id: spaceId, userId },
      data,
      { new: true, select: '_id name description icon' }
    );
  }

  static async delete(userId: string, spaceId: string): Promise<ISpace | null> {
    // Find all subjects in this space
    const subjects = await Subject.find({ spaceId: spaceId });
    const subjectIds = subjects.map(s => s._id);

    if (subjectIds.length > 0) {
      // Find all topics in these subjects
      const topics = await Topic.find({ subjectId: { $in: subjectIds } });
      const topicIds = topics.map(t => t._id);

      if (topicIds.length > 0) {
        // Delete content blocks
        await ContentBlock.deleteMany({ topicId: { $in: topicIds } });
        // Delete share links & permissions for child topics
        await ShareLink.deleteMany({ resourceType: 'topic', resourceId: { $in: topicIds } });
        await Permission.deleteMany({ resourceType: 'topic', resourceId: { $in: topicIds } });
        await Topic.deleteMany({ subjectId: { $in: subjectIds } });
      }

      // Delete share links & permissions for child subjects
      await ShareLink.deleteMany({ resourceType: 'subject', resourceId: { $in: subjectIds } });
      await Permission.deleteMany({ resourceType: 'subject', resourceId: { $in: subjectIds } });

      // Delete all subjects
      await Subject.deleteMany({ spaceId: spaceId });
    }

    // Delete share links & permissions for the space itself
    await ShareLink.deleteMany({ resourceType: 'space', resourceId: spaceId });
    await Permission.deleteMany({ resourceType: 'space', resourceId: spaceId });

    // Delete the space
    return await Space.findOneAndDelete({ _id: spaceId, userId });
  }

  static async checkOwnership(userId: string, identifier: string): Promise<boolean> {
    const query = Types.ObjectId.isValid(identifier)
      ? { _id: identifier, userId }
      : { slug: identifier, userId };
    const count = await Space.countDocuments(query);
    return count > 0;
  }
}
