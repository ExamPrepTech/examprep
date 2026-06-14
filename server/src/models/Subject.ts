import mongoose, { Schema, Document } from 'mongoose';
import slugify from "slugify";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 5);

export interface ISubject extends Document {
  title: string;
  slug: string;
  spaceId: mongoose.Types.ObjectId;
  position: number;
  topicCount: number;
  questionCount: number;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, index: true },
  spaceId: { type: Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
  position: { type: Number, default: 0 },
  topicCount: { type: Number, default: 0 },
  questionCount: { type: Number, default: 0 },
  icon: { type: String, default: 'Book' }
}, { timestamps: true });

SubjectSchema.pre("validate", async function () {
  if (this.isModified("title") || !this.slug) {
    const slugifyFn = (slugify as any).default || slugify;
    const baseSlug = slugifyFn(this.title, { lower: true, strict: true }).substring(0, 50);
    const uniquePart = nanoid();
    this.slug = `${baseSlug}-${uniquePart}`;
  }
});

export default mongoose.model<ISubject>('Subject', SubjectSchema);
