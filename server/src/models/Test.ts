import mongoose, { Schema, Document } from 'mongoose';
import { ContentBlockType } from '@/models/ContentBlock.ts';

export enum TestStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED'
}

export interface ITestConfig {
  spaceId: mongoose.Types.ObjectId;
  subjectIds: mongoose.Types.ObjectId[];
  topicIds: mongoose.Types.ObjectId[];
  questionTypes: ContentBlockType[];
  questionCount: number;
  duration: number; // in minutes
  marksPerQuestion: number;
  negativeMarks: number;
}

export interface IWarning {
  timestamp: Date;
  reason: string;
}

export interface ITest extends Document {
  userId: mongoose.Types.ObjectId;
  config: ITestConfig;
  questions: Array<{
    blockId: mongoose.Types.ObjectId;
    blockSnapshot: any; // Store a snapshot of the question at the time of test creation
    userAnswer?: any;
    correctAnswer?: any;
    isCorrect?: boolean;
    marksObtained?: number;
    timeSpent?: number; // Time spent on this question in seconds
  }>;
  status: TestStatus;
  score: number;
  totalMarks: number;
  startTime?: Date;
  endTime?: Date;
  warnings: IWarning[];
  createdAt: Date;
  updatedAt: Date;
}

const TestSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  config: {
    spaceId: { type: Schema.Types.ObjectId, ref: 'Space', requried: true },
    subjectIds: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    topicIds: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
    questionTypes: [{ type: String }],
    questionCount: { type: Number, required: true },
    duration: { type: Number, required: true },
    marksPerQuestion: { type: Number, required: true, default: 1 },
    negativeMarks: { type: Number, required: true, default: 0 }
  },
  questions: [{
    _id: false,
    blockId: { type: Schema.Types.ObjectId, ref: 'ContentBlock', required: true },
    blockSnapshot: { type: Schema.Types.Mixed, required: true }, // Store full question data
    userAnswer: { type: Schema.Types.Mixed },
    correctAnswer: { type: Schema.Types.Mixed }, // Store the correct answer for easier validation/review
    isCorrect: { type: Boolean },
    marksObtained: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 }
  }],
  status: {
    type: String,
    enum: Object.values(TestStatus),
    default: TestStatus.CREATED,
    index: true
  },
  score: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  startTime: { type: Date },
  endTime: { type: Date },
  warnings: [{
    timestamp: { type: Date, default: Date.now },
    reason: { type: String }
  }]
}, { timestamps: true });

export default mongoose.model<ITest>('Test', TestSchema);
