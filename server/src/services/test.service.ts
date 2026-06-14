import mongoose from 'mongoose';
import Test from '@/models/Test.js';
import type { ITest, ITestConfig } from '@/models/Test.js';
import { TestStatus } from '@/models/Test.js';
import ContentBlock from '@/models/ContentBlock.js';
import type { IContentBlock } from '@/models/ContentBlock.js';
import { ContentBlockType } from '@/models/ContentBlock.js';
import Subject from '@/models/Subject.js';
import Topic from '@/models/Topic.js';

export class TestService {
  /**
   * Get available question counts grouped by type for specific topics
   */
  async getAvailableQuestionCounts(topicIds: string[]) {
    const objectIds = topicIds.map((id: string) => new mongoose.Types.ObjectId(id));

    // Aggregate to count by kind
    const counts = await ContentBlock.aggregate([
      { $match: { topicId: { $in: objectIds } } },
      { $group: { _id: '$kind', count: { $sum: 1 } } }
    ]);

    return counts.reduce((acc: Record<string, number>, curr: { _id: string, count: number }) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Create a new test with random questions based on config
   */
  /**
   * Create a new test with random questions based on config
   */
  /**
   * Resolve a test config's scope (legacy flat topicIds OR hierarchical
   * space/subject/topic selections) into a flat list of topic ObjectIds.
   */
  private async resolveTopicIds(config: any): Promise<mongoose.Types.ObjectId[]> {
    const { selections } = config;

    // Branch 1: Legacy flat topicIds (backward compatibility)
    if (config.topicIds && config.topicIds.length > 0) {
      return config.topicIds.map((id: any) => new mongoose.Types.ObjectId(id));
    }

    // Branch 2: Hierarchical selections
    if (selections && Array.isArray(selections)) {
      const resolvedIds = new Set<string>();
      for (const sel of selections) {
        const { spaceId, subjects } = sel;
        if (!subjects || subjects.length === 0) {
          // Implicit: all subjects in space → all their topics
          const spaceSubjects = await Subject.find({ spaceId }).select('_id');
          const spaceSubjectIds = spaceSubjects.map(s => s._id);
          const spaceTopics = await Topic.find({ subjectId: { $in: spaceSubjectIds } }).select('_id');
          spaceTopics.forEach(t => resolvedIds.add(t._id.toString()));
        } else {
          for (const subSel of subjects) {
            const { subjectId, topics } = subSel;
            if (!topics || topics.length === 0) {
              const currentSubjectTopics = await Topic.find({ subjectId }).select('_id');
              currentSubjectTopics.forEach(t => resolvedIds.add(t._id.toString()));
            } else {
              topics.forEach((tid: string) => resolvedIds.add(tid));
            }
          }
        }
      }
      return Array.from(resolvedIds).map(id => new mongoose.Types.ObjectId(id));
    }

    return [];
  }

  /**
   * Distinct tags present on questions within a test config's scope.
   * Used to populate the tag filter in the test-creation wizard.
   */
  async getAvailableTags(config: any): Promise<string[]> {
    const topicObjectIds = await this.resolveTopicIds(config);
    if (topicObjectIds.length === 0) return [];

    const questionTypes = config.questionTypes && config.questionTypes.length > 0
      ? config.questionTypes
      : [ContentBlockType.SINGLE_SELECT_MCQ, ContentBlockType.MULTI_SELECT_MCQ, ContentBlockType.FILL_IN_THE_BLANK];

    const tags: string[] = await ContentBlock.distinct('tags', {
      topicId: { $in: topicObjectIds },
      kind: { $in: questionTypes }
    });

    return tags.filter(Boolean).sort((a, b) => a.localeCompare(b));
  }

  async createTest(userId: string, config: ITestConfig): Promise<ITest> {
    const { questionTypes, questionCount, tags } = config as any;

    // Defaults for optional config values
    const effectiveQuestionTypes = questionTypes && questionTypes.length > 0
      ? questionTypes
      : [ContentBlockType.SINGLE_SELECT_MCQ, ContentBlockType.MULTI_SELECT_MCQ, ContentBlockType.FILL_IN_THE_BLANK]; // Default to MCQ & FITB types
    const effectiveDuration = config.duration || 30; // Default 30 minutes
    const effectiveMarksPerQuestion = config.marksPerQuestion || 1;
    const effectiveNegativeMarks = config.negativeMarks || 0;
    const effectiveQuestionCount = questionCount || 10; // Default 10 questions

    // Optional tag filter: include questions carrying ANY of these tags.
    const selectedTags: string[] = Array.isArray(tags) ? tags.filter(Boolean) : [];

    const topicObjectIds = await this.resolveTopicIds(config);
    if (topicObjectIds.length === 0) {
      throw new Error('No topics selected');
    }

    const match: any = {
      topicId: { $in: topicObjectIds },
      kind: { $in: effectiveQuestionTypes }
    };
    if (selectedTags.length > 0) match.tags = { $in: selectedTags };

    const pipeline = [
      { $match: match },
      { $sample: { size: effectiveQuestionCount } }
    ];

    const randomBlocks = await ContentBlock.aggregate(pipeline);

    if (randomBlocks.length === 0) {
      throw new Error(`No questions found for the selected criteria.`);
    }

    // Map blocks to test questions structure
    const questions = randomBlocks.map((block: IContentBlock) => ({
      blockId: block._id,
      blockSnapshot: block, // Store the state of the question
      userAnswer: null,
      isCorrect: false,
      marksObtained: 0
    }));

    // Build final config with defaults applied
    const finalConfig = {
      ...config,
      questionTypes: effectiveQuestionTypes,
      questionCount: randomBlocks.length, // Actual count
      duration: effectiveDuration,
      marksPerQuestion: effectiveMarksPerQuestion,
      negativeMarks: effectiveNegativeMarks
    };

    const test = new Test({
      userId,
      config: finalConfig,
      questions,
      status: TestStatus.IN_PROGRESS,
      startTime: new Date(),
      totalMarks: questions.length * effectiveMarksPerQuestion
    });

    return await test.save();
  }

  /**
   * Get test by ID (verify ownership)
   */
  async getTestById(testId: string, userId: string): Promise<ITest | null> {
    return await Test.findOne({ _id: testId, userId });
  }

  /**
   * Get all tests for a user
   */
  async getTestsByUser(userId: string): Promise<ITest[]> {
    return await Test.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Submit test and calculate score
   */
  async submitTest(testId: string, userId: string, answers: Record<string, any>, warnings: any[], timeSpent?: Record<string, number>): Promise<ITest> {
    const test = await Test.findOne({ _id: testId, userId });
    if (!test) throw new Error('Test not found');

    if (test.status === TestStatus.COMPLETED) {
      throw new Error('Test already completed');
    }

    let score = 0;
    const positiveMarks = test.config.marksPerQuestion || 1;
    const negativeMarks = test.config.negativeMarks || 0;

    for (const q of test.questions) {
      const qId = q.blockId.toString();
      const answer = answers[qId];
      q.userAnswer = answer;

      // Update time spent
      if (timeSpent && timeSpent[qId] !== undefined) {
        q.timeSpent = Number(timeSpent[qId]);
      }


      // Simple grading logic
      const block = q.blockSnapshot;

      let isCorrect = false;

      if (block.kind === ContentBlockType.SINGLE_SELECT_MCQ || block.kind === ContentBlockType.MULTI_SELECT_MCQ) {
        if (block.options && answer) {
          // For single select, answer might be option ID or string
          // For multi select, answer might be array

          // Simplest check: compare with correct options
          // Filter correct option IDs
          const correctOptionIds = block.options.filter((o: any) => o.isCorrect).map((o: any) => o.id);

          if (Array.isArray(answer)) {
            // Multi-select exact match
            const answerIds = answer;
            isCorrect = answerIds.length === correctOptionIds.length &&
              answerIds.every((id: string) => correctOptionIds.includes(id));
          } else {
            // Single select
            isCorrect = correctOptionIds.includes(answer);
          }
        }
      } else if (block.kind === ContentBlockType.FILL_IN_THE_BLANK) {
        // FITB Grading Logic
        if (block.blankAnswers && Array.isArray(answer)) {
          const userAnswers = answer as string[];
          const correctAnswers = block.blankAnswers;

          // Check if lengths match and every answer is correct (trim + loose equality)
          if (userAnswers.length === correctAnswers.length) {
            isCorrect = userAnswers.every((ans, index) =>
              ans && correctAnswers[index] &&
              ans.toString().toLowerCase().trim() === correctAnswers[index].toString().toLowerCase().trim()
            );
          }
        }
      }

      q.isCorrect = isCorrect;

      if (isCorrect) {
        q.marksObtained = positiveMarks;
        score += positiveMarks;
      } else {
        // If attempted but wrong, apply negative marks
        // Check if answer is present (and not empty)
        const isAttempted = answer !== undefined && answer !== null &&
          (Array.isArray(answer) ? answer.length > 0 : answer !== '');

        if (isAttempted) {
          q.marksObtained = -negativeMarks;
          score -= negativeMarks;
        } else {
          q.marksObtained = 0;
        }
      }

    }

    test.score = score;
    test.status = TestStatus.COMPLETED;
    test.endTime = new Date();

    // Add any new warnings
    if (warnings && Array.isArray(warnings)) {
      test.warnings = warnings;
    }

    return await test.save();
  }

  /**
   * Update test progress without submitting (for pause/resume)
   */
  async updateProgress(testId: string, userId: string, answers: Record<string, any>, warnings: any[], timeSpent?: Record<string, number>): Promise<ITest> {
    const test = await Test.findOne({ _id: testId, userId });
    if (!test) throw new Error('Test not found');

    if (test.status === TestStatus.COMPLETED) {
      throw new Error('Cannot update progress of a completed test');
    }

    // Process answers and time spent
    test.questions.forEach((q: any) => {
      const qId = q.blockId.toString();

      // Update answer if provided
      if (answers && answers[qId] !== undefined) {
        q.userAnswer = answers[qId];
      }

      // Update time spent if provided
      if (timeSpent && timeSpent[qId] !== undefined) {
        q.timeSpent = Number(timeSpent[qId]);
      }
    });

    // Update warnings
    if (warnings && Array.isArray(warnings)) {
      test.warnings = warnings;
    }

    // Status stays IN_PROGRESS
    return await test.save();
  }
}

export default new TestService();
