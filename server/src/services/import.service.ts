import Space, { type ISpace } from '@/models/Space.ts';
import Subject, { type ISubject } from '@/models/Subject.ts';
import Topic, { type ITopic } from '@/models/Topic.ts';
import ContentBlock, { type IContentBlock } from '@/models/ContentBlock.ts';
import TestModel from '@/models/Test.ts';
import { PermissionService } from '@/services/permission.service.ts';

export class ImportService {

  static async importSpace(userId: string, spaceId: string): Promise<ISpace> {
    const hasAccess = await PermissionService.hasAccess(userId, 'space', spaceId);
    if (!hasAccess) throw new Error('Access denied');

    const original = await Space.findById(spaceId);
    if (!original) throw new Error('Space not found');

    const newSpace = await (Space.create as any)({
      name: `${original.name} copy`,
      description: original.description,
      icon: original.icon,
      userId,
    }) as ISpace;

    const subjects = await Subject.find({ spaceId });
    for (const subject of subjects) {
      const newSubject = await (Subject.create as any)({
        title: subject.title,
        icon: subject.icon,
        position: subject.position,
        spaceId: newSpace._id,
        userId,
      }) as ISubject;

      const topics = await Topic.find({ subjectId: subject._id });
      const topicBulkOps = topics.map(topic => ({
        title: topic.title,
        icon: topic.icon,
        position: topic.position,
        subjectId: newSubject._id,
        userId,
      }));
      const newTopics = await Topic.insertMany(topicBulkOps);

      const topicIdMap = new Map(
        topics.map((t, i) => [t._id.toString(), newTopics[i]!._id.toString()])
      );
      const blocks = await ContentBlock.find({ topicId: { $in: topics.map(t => t._id) } });
      const blockBulkOps = blocks.map(block => ({
        ...block.toObject(),
        _id: undefined,
        topicId: topicIdMap.get(block.topicId.toString()),
        userId,
      }));
      if (blockBulkOps.length > 0) {
        await ContentBlock.insertMany(blockBulkOps);
      }
    }

    return newSpace;
  }

  static async importSubject(
    userId: string,
    subjectId: string,
    targetSpaceId: string
  ): Promise<ISubject> {
    const hasAccess = await PermissionService.hasAccess(userId, 'subject', subjectId);
    if (!hasAccess) throw new Error('Access denied');

    const targetSpace = await Space.findOne({ _id: targetSpaceId, userId });
    if (!targetSpace) throw new Error('Target space not found or not owned by you');

    const original = await Subject.findById(subjectId);
    if (!original) throw new Error('Subject not found');

    const newSubject = await (Subject.create as any)({
      title: original.title,
      icon: original.icon,
      position: await Subject.countDocuments({ spaceId: targetSpaceId }),
      spaceId: targetSpaceId,
      userId,
    }) as ISubject;

    const topics = await Topic.find({ subjectId: original._id });
    const topicBulkOps = topics.map(topic => ({
      title: topic.title,
      icon: topic.icon,
      position: topic.position,
      subjectId: newSubject._id,
      userId,
    }));
    const newTopics = await Topic.insertMany(topicBulkOps);

    const topicIdMap = new Map(
      topics.map((t, i) => [t._id.toString(), newTopics[i]!._id.toString()])
    );
    const blocks = await ContentBlock.find({ topicId: { $in: topics.map(t => t._id) } });
    const blockBulkOps = blocks.map(block => ({
      ...block.toObject(),
      _id: undefined,
      topicId: topicIdMap.get(block.topicId.toString()),
      userId,
    }));
    if (blockBulkOps.length > 0) {
      await ContentBlock.insertMany(blockBulkOps);
    }

    return newSubject;
  }

  static async importTopic(
    userId: string,
    topicId: string,
    targetSubjectId: string
  ): Promise<ITopic> {
    const hasAccess = await PermissionService.hasAccess(userId, 'topic', topicId);
    if (!hasAccess) throw new Error('Access denied');

    const targetSubject = await Subject.findOne({ _id: targetSubjectId, userId });
    if (!targetSubject) throw new Error('Target subject not found or not owned by you');

    const original = await Topic.findById(topicId);
    if (!original) throw new Error('Topic not found');

    const newTopic = await (Topic.create as any)({
      title: original.title,
      icon: original.icon,
      position: await Topic.countDocuments({ subjectId: targetSubjectId }),
      subjectId: targetSubjectId,
      userId,
    }) as ITopic;

    const blocks = await ContentBlock.find({ topicId: original._id });
    const blockBulkOps = blocks.map(block => ({
      ...block.toObject(),
      _id: undefined,
      topicId: newTopic._id,
      userId,
    }));
    if (blockBulkOps.length > 0) {
      await ContentBlock.insertMany(blockBulkOps);
    }

    return newTopic;
  }

  static async takeTest(userId: string, testId: string): Promise<any> {
    const hasAccess = await PermissionService.hasAccess(userId, 'test', testId);
    if (!hasAccess) throw new Error('Access denied');

    const original = await TestModel.findById(testId);
    if (!original) throw new Error('Test not found');

    const blockIds = original.questions.map(q => q.blockId);
    const blocks = await ContentBlock.find({ _id: { $in: blockIds } });
    const blockMap = new Map(blocks.map(b => [b._id.toString(), b]));

    const questions = original.questions.map(q => {
      const freshBlock = blockMap.get(q.blockId.toString());
      return {
        blockId: q.blockId,
        blockSnapshot: freshBlock ? freshBlock.toObject() : q.blockSnapshot,
        userAnswer: undefined,
        isCorrect: undefined,
        marksObtained: undefined,
        timeSpent: 0,
      };
    });

    const newTest = await (TestModel.create as any)({
      userId,
      config: { ...original.config } as any,
      questions,
      status: 'IN_PROGRESS',
      score: 0,
      totalMarks: original.totalMarks,
      startTime: new Date(),
    });

    return newTest;
  }
}
