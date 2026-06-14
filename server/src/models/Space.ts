import mongoose, { Schema, Document } from "mongoose";
import slugify from "slugify";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 5);

export interface ISpace extends Document {
  name: string;
  description?: string;
  slug: string;
  userId: mongoose.Types.ObjectId;
  icon: string;
  subjectCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SpaceSchema = new Schema<ISpace>(
  {
    name: { type: String, required: true },
    description: String,
    slug: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    icon: { type: String, default: "Book" },
    subjectCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

SpaceSchema.pre("validate", async function () {
  if (this.isModified("name") || !this.slug) {
    const slugifyFn = (slugify as any).default || slugify;
    const baseSlug = slugifyFn(this.name, { lower: true, strict: true }).substring(0, 50);
    const uniquePart = nanoid();
    this.slug = `${baseSlug}-${uniquePart}`;
  }
});

export default mongoose.model<ISpace>("Space", SpaceSchema);
