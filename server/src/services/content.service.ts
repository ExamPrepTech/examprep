
import ContentBlock, { type IContentBlock } from '@/models/ContentBlock.ts';
import Subject from '@/models/Subject.ts';
import { TopicService } from '@/services/topic.service.ts';
import { Types } from 'mongoose';

export class ContentService {

  static async create(userId: string, data: Partial<IContentBlock>): Promise<IContentBlock> {
    if (!data.topicId) {
      throw new Error('Topic ID is required');
    }

    // Resolve topic slug to ID if necessary
    let topicId = data.topicId.toString();
    if (!Types.ObjectId.isValid(topicId)) {
      const topic = await TopicService.findOne(userId, topicId);
      if (!topic) throw new Error('Topic not found');
      topicId = (topic._id as any).toString();
    }

    const hasAccess = await TopicService.checkOwnership(userId, topicId);
    if (!hasAccess) {
      throw new Error('Access denied to topic');
    }

    if (data.position === undefined) {
      const count = await ContentBlock.countDocuments({ topicId: topicId });
      data.position = count;
    }

    const block = new ContentBlock({ ...data, topicId: topicId, userId });
    const savedBlock = await block.save();
    // Increment Subject questionCount if this block is a question
    const questionKinds = ['single_select_mcq', 'multi_select_mcq', 'descriptive', 'fill_in_the_blank'];
    if (data.kind && questionKinds.includes(data.kind)) {
      const topic = await TopicService.findOne(userId, topicId);
      if (topic) {
        await Subject.findByIdAndUpdate(topic.subjectId, { $inc: { questionCount: 1 } });
      }
    }

    return savedBlock;
  }

  static async findAll(userId: string, topicIdentifier: string, options: {
    types?: string[];
    tags?: string[];
    search?: string;
    cursor?: string;
    limit?: number;
  } = {}): Promise<{ blocks: IContentBlock[], nextCursor: string | null }> {
    const topic = await TopicService.findOne(userId, topicIdentifier);
    if (!topic) {
      throw new Error('Access denied or Topic not found');
    }

    const query: any = { topicId: topic._id };

    if (options.types && options.types.length > 0) {
      query.kind = { $in: options.types };
    }

    if (options.tags && options.tags.length > 0) {
      query.tags = { $in: options.tags };
    }

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      query.$or = [
        { content: searchRegex },
        { question: searchRegex },
        { answer: searchRegex },
        { explanation: searchRegex },
        { notes: searchRegex }
      ];
    }

    // Cursor Pagination Logic
    if (options.cursor) {
      if (Types.ObjectId.isValid(options.cursor)) {
        const lastBlock = await ContentBlock.findById(options.cursor);
        if (lastBlock) {
          // If we are filtering by search or random aspects, position sort might still be desired?
          // Usually infinite scroll retains the sort order.
          // Default sort is position: 1.
          if (options.search) {
            // When searching, position might be less relevant due to relevance? 
            // For now, let's stick to stable sort: position, _id
            // Complex query with OR for stable pagination
            query.$or = [
              { position: { $gt: lastBlock.position } },
              { position: lastBlock.position, _id: { $gt: lastBlock._id } }
            ];
          } else {
            query.$or = [
              { position: { $gt: lastBlock.position } },
              { position: lastBlock.position, _id: { $gt: lastBlock._id } }
            ];
          }
        }
      }
    }

    const limit = options.limit || 20;

    // Fetch one extra to know if there is a next page
    const blocks = await ContentBlock.find(query, '_id topicId kind content question answer explanation notes tags group options blankAnswers hints data position updatedAt imageUrl')
      .sort({ position: 1, _id: 1 })
      .limit(limit + 1);

    const hasNextPage = blocks.length > limit;
    const data = hasNextPage ? blocks.slice(0, limit) : blocks;
    const nextCursor = (hasNextPage && data.length > 0) ? data[data.length - 1]!._id.toString() : null;

    return { blocks: data, nextCursor };
  }

  static async checkOwnership(userId: string, blockId: string): Promise<boolean> {
    const count = await ContentBlock.countDocuments({ _id: blockId, userId });
    return count > 0;
  }

  static async update(userId: string, blockId: string, data: Partial<IContentBlock>): Promise<IContentBlock | null> {
    const hasAccess = await this.checkOwnership(userId, blockId);
    if (!hasAccess) throw new Error('Access denied');
    return await ContentBlock.findByIdAndUpdate(blockId, data, { new: true });
  }

  static async delete(userId: string, blockId: string): Promise<IContentBlock | null> {
    const hasAccess = await this.checkOwnership(userId, blockId);
    if (!hasAccess) throw new Error('Access denied');

    const deletedBlock = await ContentBlock.findByIdAndDelete(blockId);

    if (deletedBlock) {
      const questionKinds = ['single_select_mcq', 'multi_select_mcq', 'descriptive', 'fill_in_the_blank'];
      if (deletedBlock.kind && questionKinds.includes(deletedBlock.kind)) {
        const topic = await TopicService.findOne(userId, deletedBlock.topicId.toString());
        if (topic) {
          await Subject.findByIdAndUpdate(topic.subjectId, { $inc: { questionCount: -1 } });
        }
      }
    }

    return deletedBlock;
  }
  static async createMany(userId: string, topicId: string, blocksData: Partial<IContentBlock>[]): Promise<IContentBlock[]> {
    if (!blocksData || blocksData.length === 0) return [];

    // 1. Check Access
    const hasAccess = await TopicService.checkOwnership(userId, topicId);
    if (!hasAccess) {
      throw new Error('Access denied to topic');
    }

    // 2. Get current position count to append
    const currentCount = await ContentBlock.countDocuments({ topicId: topicId });

    // 3. Prepare blocks
    let newQuestionCount = 0;
    const questionKinds = ['single_select_mcq', 'multi_select_mcq', 'descriptive', 'fill_in_the_blank'];

    const blocksToInsert = blocksData.map((data, index) => {
      if (data.kind && questionKinds.includes(data.kind)) {
        newQuestionCount++;
      }
      return {
        ...data,
        topicId: topicId,
        userId,
        position: currentCount + index,
      };
    });

    // 4. Bulk Insert
    const insertedBlocks = await ContentBlock.insertMany(blocksToInsert);

    // 5. Update Subject Count
    if (newQuestionCount > 0) {
      const topic = await TopicService.findOne(userId, topicId);
      if (topic) {
        await Subject.findByIdAndUpdate(topic.subjectId, { $inc: { questionCount: newQuestionCount } });
      }
    }

    return insertedBlocks as unknown as IContentBlock[];
  }
}
