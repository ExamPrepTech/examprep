import mongoose, { Schema, Document } from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

export type ResourceType = 'space' | 'subject' | 'topic' | 'contentBlock' | 'test';

export interface IShareLink extends Document {
  resourceType: ResourceType;
  resourceId: mongoose.Types.ObjectId;
  hash: string;
  createdBy: mongoose.Types.ObjectId;
  expiresAt?: Date;
  maxUses?: number;
  useCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShareLinkSchema = new Schema<IShareLink>({
  resourceType: {
    type: String,
    required: true,
    enum: ['space', 'subject', 'topic', 'contentBlock', 'test'],
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  hash: {
    type: String,
    required: true,
    unique: true,
    default: () => nanoid(),
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: { type: Date },
  maxUses: { type: Number },
  useCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

ShareLinkSchema.index({ resourceType: 1, resourceId: 1 });
ShareLinkSchema.index({ hash: 1 });

export default mongoose.model<IShareLink>('ShareLink', ShareLinkSchema);
