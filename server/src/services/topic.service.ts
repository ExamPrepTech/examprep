import Topic, { type ITopic } from '@/models/Topic.ts';
import Subject from '@/models/Subject.ts';
import ContentBlock from '@/models/ContentBlock.ts';
import { SubjectService } from '@/services/subject.service.ts';
import { PermissionService } from '@/services/permission.service.ts';
import { Types } from 'mongoose';

export class TopicService {

  static async create(userId: string, data: Partial<ITopic>): Promise<ITopic> {
    if (!data.subjectId) {
      throw new Error('Subject ID is required');
    }

    // Resolve subject slug to ID if necessary
    let subjectId = data.subjectId.toString();
    if (!Types.ObjectId.isValid(subjectId)) {
      const subject = await SubjectService.findOne(userId, subjectId);
      if (!subject) throw new Error('Subject not found');
      subjectId = (subject._id as any).toString();
    }

    const hasAccess = await SubjectService.checkOwnership(userId, subjectId);
    if (!hasAccess) {
      throw new Error('Access denied to subject');
    }

    if (data.position === undefined) {
      const count = await Topic.countDocuments({ subjectId: subjectId });
      data.position = count;
    }

    const topic = new Topic({ ...data, subjectId: subjectId, userId });
    const savedTopic = await topic.save();
    await Subject.findByIdAndUpdate(subjectId, { $inc: { topicCount: 1 } });
    return savedTopic;
  }

  static async findAll(userId: string, subjectIdentifier: string): Promise<any[]> {
    const subject = await SubjectService.findOne(userId, subjectIdentifier);
    if (!subject) {
      throw new Error('Access denied or Subject not found');
    }
    const topics = await Topic.find({ subjectId: subject._id }, '_id title subjectId position slug icon').sort({ position: 1, createdAt: 1 });

    // Aggregate question counts for these topics
    const topicIds = topics.map(s => s._id);
    const agg = await ContentBlock.aggregate([
      {
        $match: {
          topicId: { $in: topicIds },
          kind: { $in: ['single_select_mcq', 'multi_select_mcq', 'descriptive', 'fill_in_the_blank'] }
        }
      },
      { $group: { _id: '$topicId', total: { $sum: 1 } } }
    ]);

    const countMap = new Map(agg.map((a: any) => [a._id.toString(), a.total]));

    return topics.map(t => {
      const tId = (t._id as any).toString();
      const totalQuestions = countMap.get(tId) || 0;

      return {
        ...t.toObject(),
        questionCount: totalQuestions,
      };
    });
  }

  static async findOne(userId: string, identifier: string): Promise<ITopic | null> {
    const query = Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { slug: identifier };
    const topic = await Topic.findOne(query);
    if (!topic) return null;
    const hasAccess = await PermissionService.hasAccess(userId, 'topic', topic._id.toString());
    if (!hasAccess) return null;
    return topic;
  }

  static async update(userId: string, topicId: string, data: Partial<ITopic>): Promise<ITopic | null> {
    const hasAccess = await this.checkOwnership(userId, topicId);
    if (!hasAccess) throw new Error('Access denied');
    return await Topic.findByIdAndUpdate(topicId, data, { new: true });
  }

  static async delete(userId: string, topicId: string): Promise<ITopic | null> {
    const hasAccess = await this.checkOwnership(userId, topicId);
    if (!hasAccess) throw new Error('Access denied');

    await ContentBlock.deleteMany({ topicId: topicId });
    const deletedTopic = await Topic.findByIdAndDelete(topicId);
    if (deletedTopic) {
      await Subject.findByIdAndUpdate(deletedTopic.subjectId, { $inc: { topicCount: -1 } });
    }
    return deletedTopic;
  }

  static async checkOwnership(userId: string, topicId: string): Promise<boolean> {
    const count = await Topic.countDocuments({ _id: topicId, userId });
    return count > 0;
  }
}
