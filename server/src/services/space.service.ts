import Space, { type ISpace } from '@/models/Space.ts';
import Subject from '@/models/Subject.ts';
import Topic from '@/models/Topic.ts';
import ContentBlock from '@/models/ContentBlock.ts';
import { Types } from 'mongoose';

export class SpaceService {

  static async create(userId: string, data: Partial<ISpace>): Promise<ISpace> {
    const space = new Space({ ...data, userId });
    return await space.save();
  }

  static async findAll(userId: string): Promise<any[]> {
    const spaces = await Space.find({ userId }, '_id name description slug icon subjectCount').sort({ createdAt: -1 });

    // Aggregate question counts for these spaces
    // Aggregate question counts and subject counts for these spaces
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

    return spaces.map(s => {
      const stats = countMap.get((s._id as any).toString()) || { questionTotal: 0, subjectTotal: 0 };
      return {
        ...s.toObject(),
        questionCount: stats.questionTotal,
        subjectCount: stats.subjectTotal // Override stored count with actual count
      };
    });
  }

  static async findOne(userId: string, identifier: string): Promise<ISpace | null> {
    const query = Types.ObjectId.isValid(identifier)
      ? { _id: identifier, userId }
      : { slug: identifier, userId };
    return await Space.findOne(query, '_id name description slug icon');
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
        await ContentBlock.deleteMany({ topicId: { $in: topicIds } });
        await Topic.deleteMany({ subjectId: { $in: subjectIds } });
      }

      // Delete all subjects
      await Subject.deleteMany({ spaceId: spaceId });
    }

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
