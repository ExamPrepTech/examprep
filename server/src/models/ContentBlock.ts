import mongoose, { Schema, Document } from 'mongoose';

export enum ContentBlockType {
  NOTE = 'note',
  SINGLE_SELECT_MCQ = 'single_select_mcq',
  MULTI_SELECT_MCQ = 'multi_select_mcq',
  FILL_IN_THE_BLANK = 'fill_in_the_blank'
}

export interface IContentBlock extends Document {
  topicId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  position: number;
  kind: ContentBlockType;
  content?: string;
  question?: string;
  explanation?: string;
  notes?: string;
  tags?: string[];
  group?: string;
  blankAnswers?: string[];
  hints?: string[];
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentBlockSchema: Schema = new Schema({
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  position: { type: Number, default: 0 },
  kind: {
    type: String,
    required: true,
    enum: Object.values(ContentBlockType)
  },
  // Type-specific fields (sparse to save space/clarity, or we could use discriminators but single collection is easier for ordering)
  content: { type: String }, // For Note
  question: { type: String }, // For MCQs
  explanation: { type: String },
  notes: { type: String }, // Additional notes for the question
  tags: [{ type: String }], // Array of strings for hashtags
  group: { type: String }, // For grouping blocks (e.g. "Section 1")
  hints: [{ type: String }], // Array of hints
  blankAnswers: [{ type: String }],
  options: [{
    _id: false, // Don't need separate ID for subdocs if we handle ID manually or just don't care
    id: String,
    text: String,
    isCorrect: Boolean
  }],
  imageUrl: { type: String }, // Optional question image (external URL)
}, { timestamps: true });

ContentBlockSchema.index({ topicId: 1 });
ContentBlockSchema.index({ userId: 1, topicId: 1 });

export default mongoose.model<IContentBlock>('ContentBlock', ContentBlockSchema);
