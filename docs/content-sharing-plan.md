# Content Sharing — Simplified Plan (View + Clone Only)

---

## Overview

Enable sharing at every hierarchy level (Space → Subject → Topic → ContentBlock → Test) with read-only access. Recipients can **view** shared content or **clone** it (import as their own copy).

### Two Access Modes

| Mode | Behavior |
|---|---|
| **Live Reference** | Content appears in "Shared with me" section only. User browses live — owner's edits propagate automatically. |
| **Imported Copy** | User can "import" shared content into their own workspace, creating a static duplicate they own independently. |

### Test Sharing (special)

Sharing a test shares only the **question set + configuration**, never the original user's answers/scores. Starting a shared test creates a **brand new Test document** for the receiver.

---

## Current Architecture

```
Space ────────── has userId ✓
  └─ Subject ─── has userId ✗  (resolved via spaceId → Space.userId)
      └─ Topic ─── has userId ✗  (resolved via subjectId → Subject → Space.userId)
          └─ ContentBlock ─── has userId ✗  (resolved via topicId → ... → Space.userId)

Test ─────────── has userId ✓
```

---

# Phase 1: Add `userId` to Every Level

---

## 1.1 Model: Subject — Add `userId`

**File:** `server/src/models/Subject.ts`

Add to the schema and interface:

```ts
export interface ISubject extends Document {
  title: string;
  slug: string;
  spaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;    // NEW
  position: number;
  topicCount: number;
  questionCount: number;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}
```

In the Schema definition, add:

```ts
const SubjectSchema: Schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, index: true },
  spaceId: { type: Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // NEW
  position: { type: Number, default: 0 },
  topicCount: { type: Number, default: 0 },
  questionCount: { type: Number, default: 0 },
  icon: { type: String, default: 'Book' }
}, { timestamps: true });
```

Add a compound index after the schema:

```ts
SubjectSchema.index({ userId: 1, spaceId: 1 });
```

---

## 1.2 Model: Topic — Add `userId`

**File:** `server/src/models/Topic.ts`

```ts
export interface ITopic extends Document {
  title: string;
  slug: string;
  subjectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;    // NEW
  position: number;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}
```

```ts
const TopicSchema: Schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, index: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // NEW
  position: { type: Number, default: 0 },
  icon: { type: String, default: 'Hash' }
}, { timestamps: true });

TopicSchema.index({ userId: 1, subjectId: 1 });
```

---

## 1.3 Model: ContentBlock — Add `userId`

**File:** `server/src/models/ContentBlock.ts`

```ts
export interface IContentBlock extends Document {
  topicId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;    // NEW
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
```

```ts
const ContentBlockSchema: Schema = new Schema({
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // NEW
  position: { type: Number, default: 0 },
  kind: {
    type: String,
    required: true,
    enum: Object.values(ContentBlockType)
  },
  content: { type: String },
  question: { type: String },
  explanation: { type: String },
  notes: { type: String },
  tags: [{ type: String }],
  group: { type: String },
  hints: [{ type: String }],
  blankAnswers: [{ type: String }],
  options: [{
    _id: false,
    id: String,
    text: String,
    isCorrect: Boolean
  }],
  imageUrl: { type: String },
}, { timestamps: true });

ContentBlockSchema.index({ userId: 1, topicId: 1 });
```

---

## 1.4 Service: SubjectService — Pass userId on create, simplify checkOwnership

**File:** `server/src/services/subject.service.ts`

### create() — Pass userId to document

```ts
static async create(userId: string, data: Partial<ISubject>): Promise<ISubject> {
  if (!data.spaceId) {
    throw new Error('Space ID is required');
  }

  let spaceId = data.spaceId.toString();
  if (!Types.ObjectId.isValid(spaceId)) {
    const space = await SpaceService.findOne(userId, spaceId);
    if (!space) throw new Error('Space not found');
    spaceId = (space._id as any).toString();
  }

  const hasAccess = await SpaceService.checkOwnership(userId, spaceId);
  if (!hasAccess) {
    throw new Error('Access denied to space');
  }

  if (data.position === undefined) {
    const count = await Subject.countDocuments({ spaceId });
    data.position = count;
  }

  const subject = new Subject({ ...data, spaceId, userId });  // userId added
  const savedSubject = await subject.save();
  await Space.findByIdAndUpdate(spaceId, { $inc: { subjectCount: 1 } });
  return savedSubject;
}
```

### checkOwnership() — Direct query instead of parent traversal

```ts
static async checkOwnership(userId: string, identifier: string): Promise<boolean> {
  const query = Types.ObjectId.isValid(identifier)
    ? { _id: identifier, userId }
    : { slug: identifier, userId };
  const count = await Subject.countDocuments(query);
  return count > 0;
}
```

### findOne() — Simplify to direct query

```ts
static async findOne(userId: string, identifier: string): Promise<ISubject | null> {
  const query = Types.ObjectId.isValid(identifier)
    ? { _id: identifier, userId }
    : { slug: identifier, userId };
  return await Subject.findOne(query, '_id title spaceId position slug topicCount questionCount icon');
}
```

### update() — Use direct ownership check

```ts
static async update(userId: string, subjectId: string, data: Partial<ISubject>): Promise<ISubject | null> {
  const hasAccess = await this.checkOwnership(userId, subjectId);
  if (!hasAccess) throw new Error('Access denied');
  return await Subject.findByIdAndUpdate(subjectId, data, { new: true });
}
```

### delete() — Use direct ownership check

```ts
static async delete(userId: string, subjectId: string): Promise<ISubject | null> {
  const hasAccess = await this.checkOwnership(userId, subjectId);
  if (!hasAccess) throw new Error('Access denied');
  // ... rest of delete logic unchanged
}
```

---

## 1.5 Service: TopicService — Pass userId on create, simplify checkOwnership

**File:** `server/src/services/topic.service.ts`

### create()

```ts
static async create(userId: string, data: Partial<ITopic>): Promise<ITopic> {
  if (!data.subjectId) throw new Error('Subject ID is required');

  let subjectId = data.subjectId.toString();
  if (!Types.ObjectId.isValid(subjectId)) {
    const subject = await SubjectService.findOne(userId, subjectId);
    if (!subject) throw new Error('Subject not found');
    subjectId = (subject._id as any).toString();
  }

  const hasAccess = await SubjectService.checkOwnership(userId, subjectId);
  if (!hasAccess) throw new Error('Access denied to subject');

  if (data.position === undefined) {
    const count = await Topic.countDocuments({ subjectId });
    data.position = count;
  }

  const topic = new Topic({ ...data, subjectId, userId });  // userId added
  const savedTopic = await topic.save();
  await Subject.findByIdAndUpdate(subjectId, { $inc: { topicCount: 1 } });
  return savedTopic;
}
```

### checkOwnership()

```ts
static async checkOwnership(userId: string, identifier: string): Promise<boolean> {
  const query = Types.ObjectId.isValid(identifier)
    ? { _id: identifier, userId }
    : { slug: identifier, userId };
  const count = await Topic.countDocuments(query);
  return count > 0;
}
```

### findOne()

```ts
static async findOne(userId: string, identifier: string): Promise<ITopic | null> {
  const query = Types.ObjectId.isValid(identifier)
    ? { _id: identifier, userId }
    : { slug: identifier, userId };
  return await Topic.findOne(query);
}
```

---

## 1.6 Service: ContentService — Pass userId on create, simplify checkOwnership

**File:** `server/src/services/content.service.ts`

### create()

```ts
static async create(userId: string, data: Partial<IContentBlock>): Promise<IContentBlock> {
  if (!data.topicId) throw new Error('Topic ID is required');

  let topicId = data.topicId.toString();
  if (!Types.ObjectId.isValid(topicId)) {
    const topic = await TopicService.findOne(userId, topicId);
    if (!topic) throw new Error('Topic not found');
    topicId = (topic._id as any).toString();
  }

  const hasAccess = await TopicService.checkOwnership(userId, topicId);
  if (!hasAccess) throw new Error('Access denied to topic');

  if (data.position === undefined) {
    const count = await ContentBlock.countDocuments({ topicId });
    data.position = count;
  }

  const block = new ContentBlock({ ...data, topicId, userId });  // userId added
  const savedBlock = await block.save();
  // ... increment questionCount logic unchanged
  return savedBlock;
}
```

### createMany()

```ts
static async createMany(userId: string, topicId: string, blocksData: Partial<IContentBlock>[]): Promise<IContentBlock[]> {
  if (!blocksData || blocksData.length === 0) return [];

  const hasAccess = await TopicService.checkOwnership(userId, topicId);
  if (!hasAccess) throw new Error('Access denied to topic');

  const currentCount = await ContentBlock.countDocuments({ topicId });
  let newQuestionCount = 0;
  const questionKinds = ['single_select_mcq', 'multi_select_mcq', 'descriptive', 'fill_in_the_blank'];

  const blocksToInsert = blocksData.map((data, index) => {
    if (data.kind && questionKinds.includes(data.kind)) newQuestionCount++;
    return { ...data, topicId, userId, position: currentCount + index };  // userId added
  });

  const insertedBlocks = await ContentBlock.insertMany(blocksToInsert);
  // ... increment questionCount logic unchanged
  return insertedBlocks as unknown as IContentBlock[];
}
```

### checkOwnership() — New method

```ts
static async checkOwnership(userId: string, blockId: string): Promise<boolean> {
  const count = await ContentBlock.countDocuments({ _id: blockId, userId });
  return count > 0;
}
```

### update() — Use direct ownership check

```ts
static async update(userId: string, blockId: string, data: Partial<IContentBlock>): Promise<IContentBlock | null> {
  const hasAccess = await this.checkOwnership(userId, blockId);
  if (!hasAccess) throw new Error('Access denied');
  return await ContentBlock.findByIdAndUpdate(blockId, data, { new: true });
}
```

### delete() — Use direct ownership check

```ts
static async delete(userId: string, blockId: string): Promise<IContentBlock | null> {
  const hasAccess = await this.checkOwnership(userId, blockId);
  if (!hasAccess) throw new Error('Access denied');
  // ... rest unchanged
}
```

### findAll() — Keep parent traversal for permission

Leave `findAll()` as-is for now — it resolves the topic via `TopicService.findOne()` which checks ownership. Phase 2 will refactor all `findAll()` methods.

---

## 1.7 Backfill Script: `server/scripts/backfill-userIds.ts`

```ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Space from '@/models/Space.ts';
import Subject from '@/models/Subject.ts';
import Topic from '@/models/Topic.ts';
import ContentBlock from '@/models/ContentBlock.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function backfillUserIds() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Build spaceId → userId map
  const spaces = await Space.find({}, '_id userId');
  const spaceOwner = new Map(spaces.map(s => [s._id.toString(), s.userId.toString()]));
  console.log(`Found ${spaces.length} spaces`);

  // 2. Backfill Subjects
  const subjects = await Subject.find({ userId: { $exists: false } });
  console.log(`Backfilling ${subjects.length} subjects...`);
  for (const subject of subjects) {
    const userId = spaceOwner.get(subject.spaceId.toString());
    if (userId) {
      subject.userId = userId;
      await subject.save();
    }
  }

  // 3. Build subjectId → userId map
  const allSubjects = await Subject.find({}, '_id userId');
  const subjectOwner = new Map(allSubjects.map(s => [s._id.toString(), s.userId.toString()]));

  // 4. Backfill Topics
  const topics = await Topic.find({ userId: { $exists: false } });
  console.log(`Backfilling ${topics.length} topics...`);
  for (const topic of topics) {
    const userId = subjectOwner.get(topic.subjectId.toString());
    if (userId) {
      topic.userId = userId;
      await topic.save();
    }
  }

  // 5. Build topicId → userId map
  const allTopics = await Topic.find({}, '_id userId');
  const topicOwner = new Map(allTopics.map(t => [t._id.toString(), t.userId.toString()]));

  // 6. Backfill ContentBlocks
  const blocks = await ContentBlock.find({ userId: { $exists: false } });
  console.log(`Backfilling ${blocks.length} content blocks...`);
  for (const block of blocks) {
    const userId = topicOwner.get(block.topicId.toString());
    if (userId) {
      block.userId = userId;
      await block.save();
    }
  }

  console.log('Backfill complete.');
  await mongoose.disconnect();
  process.exit(0);
}

backfillUserIds().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
```

**Run:** `npx tsx server/scripts/backfill-userIds.ts`

---

# Phase 2: View-Only Sharing System

---

## 2.1 Permission Model — `server/src/models/Permission.ts`

```ts
import mongoose, { Schema, Document } from 'mongoose';

export type ResourceType = 'space' | 'subject' | 'topic' | 'contentBlock' | 'test';
export type GrantType = 'invite' | 'link';
export type PermissionStatus = 'active' | 'pending' | 'revoked';

export interface IPermission extends Document {
  resourceType: ResourceType;
  resourceId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  email?: string;
  grantType: GrantType;
  linkHash?: string;
  invitedBy: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  status: PermissionStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>({
  resourceType: {
    type: String,
    required: true,
    enum: ['space', 'subject', 'topic', 'contentBlock', 'test'],
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  email: { type: String },
  grantType: {
    type: String,
    required: true,
    enum: ['invite', 'link'],
  },
  linkHash: { type: String, index: true },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  acceptedAt: { type: Date },
  status: {
    type: String,
    required: true,
    enum: ['active', 'pending', 'revoked'],
    default: 'pending',
    index: true,
  },
  expiresAt: { type: Date },
}, { timestamps: true });

// Compound index for permission lookups
PermissionSchema.index({ resourceType: 1, resourceId: 1, status: 1 });
// Index for "find all resources shared with user"
PermissionSchema.index({ userId: 1, status: 1 });
// Index for link hash resolution
PermissionSchema.index({ linkHash: 1 }, { sparse: true });

export default mongoose.model<IPermission>('Permission', PermissionSchema);
```

### Zod Validation Schemas

```ts
import { z } from 'zod';

export const createPermissionSchema = z.object({
  resourceType: z.enum(['space', 'subject', 'topic', 'contentBlock', 'test']),
  resourceId: z.string().min(1),
  email: z.string().email().optional(),
  userId: z.string().optional(),
});
```

---

## 2.2 ShareLink Model — `server/src/models/ShareLink.ts`

```ts
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
```

### Zod Validation for ShareLink

```ts
export const createShareLinkSchema = z.object({
  resourceType: z.enum(['space', 'subject', 'topic', 'contentBlock', 'test']),
  resourceId: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().positive().optional(),
});
```

---

## 2.3 PermissionService — `server/src/services/permission.service.ts`

```ts
import Permission, {
  IPermission,
  ResourceType,
  PermissionStatus,
} from '@/models/Permission.ts';
import Space from '@/models/Space.ts';
import Subject from '@/models/Subject.ts';
import Topic from '@/models/Topic.ts';
import ContentBlock from '@/models/ContentBlock.ts';
import Test from '@/models/Test.ts';
import User from '@/models/User.ts';
import { mailService } from '@/services/mail/mail.service.ts';
import { Types } from 'mongoose';

/**
 * Resolve a resource to its parent resource type and ID.
 * Returns null if there is no parent (i.e., Space has no parent).
 */
async function resolveParent(
  resourceType: ResourceType,
  resourceId: string
): Promise<{ type: ResourceType; id: string } | null> {
  switch (resourceType) {
    case 'contentBlock': {
      const block = await ContentBlock.findById(resourceId, 'topicId');
      if (!block) return null;
      return { type: 'topic', id: block.topicId.toString() };
    }
    case 'topic': {
      const topic = await Topic.findById(resourceId, 'subjectId');
      if (!topic) return null;
      return { type: 'subject', id: topic.subjectId.toString() };
    }
    case 'subject': {
      const subject = await Subject.findById(resourceId, 'spaceId');
      if (!subject) return null;
      return { type: 'space', id: subject.spaceId.toString() };
    }
    case 'space':
    case 'test':
      return null; // top-level resources
    default:
      return null;
  }
}

/**
 * Get the userId owner of a resource by querying its own userId field.
 */
async function getResourceOwner(
  resourceType: ResourceType,
  resourceId: string
): Promise<string | null> {
  const models: Record<ResourceType, any> = {
    space: Space,
    subject: Subject,
    topic: Topic,
    contentBlock: ContentBlock,
    test: Test,
  };
  const Model = models[resourceType];
  if (!Model) return null;
  const doc = await Model.findById(resourceId, 'userId');
  return doc?.userId?.toString() ?? null;
}

export class PermissionService {

  /**
   * Core permission resolution.
   * Checks: ownership → direct permission → parent chain inheritance.
   * Returns true if user has view access, false otherwise.
   */
  static async hasAccess(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<boolean> {
    // 1. Ownership check
    const ownerId = await getResourceOwner(resourceType, resourceId);
    if (ownerId === userId) return true;

    // 2. Direct permission on this resource
    const direct = await Permission.findOne({
      resourceType,
      resourceId,
      userId,
      status: 'active',
    });
    if (direct) return true;

    // 3. Walk up parent chain
    const parent = await resolveParent(resourceType, resourceId);
    if (parent) {
      return PermissionService.hasAccess(userId, parent.type, parent.id);
    }

    return false;
  }

  /**
   * Grant view-only access to a user.
   * If `userId` is provided: creates active permission immediately.
   * If only `email` is provided: creates pending permission; if user exists, activates it.
   * Sends email notification on success.
   */
  static async grant(params: {
    resourceType: ResourceType;
    resourceId: string;
    invitedBy: string;
    userId?: string;
    email?: string;
  }): Promise<IPermission> {
    const { resourceType, resourceId, invitedBy, userId, email } = params;

    let targetUserId = userId;
    let targetEmail = email;

    // If email provided but no userId, look up existing user
    if (!targetUserId && targetEmail) {
      const existingUser = await User.findOne({ email: targetEmail });
      if (existingUser) {
        targetUserId = existingUser._id.toString();
      }
    }

    // Verify the inviter owns the resource
    const ownerId = await getResourceOwner(resourceType, resourceId);
    if (ownerId !== invitedBy) {
      throw new Error('Only the resource owner can share content');
    }

    // Check for existing permission (prevent duplicates)
    if (targetUserId) {
      const existing = await Permission.findOne({
        resourceType,
        resourceId,
        userId: targetUserId,
        status: { $ne: 'revoked' },
      });
      if (existing) {
        throw new Error('User already has access to this resource');
      }
    }

    const permission = await Permission.create({
      resourceType,
      resourceId,
      userId: targetUserId || undefined,
      email: targetEmail,
      grantType: 'invite',
      invitedBy,
      status: targetUserId ? 'active' : 'pending',
    });

    // Send email notification
    if (targetEmail) {
      const resourceName = await PermissionService.getResourceName(resourceType, resourceId);
      await mailService.send({
        to: targetEmail,
        subject: `Content shared with you: "${resourceName}"`,
        html: `<p>Content has been shared with you on Arena.</p>
               <p><a href="${process.env.CLIENT_URL}/shared-with-me">View shared content</a></p>`,
      });
    }

    return permission;
  }

  /**
   * Revoke access (soft delete — sets status to 'revoked').
   * Only the resource owner can revoke.
   */
  static async revoke(permissionId: string, revokedBy: string): Promise<IPermission | null> {
    const permission = await Permission.findById(permissionId);
    if (!permission) throw new Error('Permission not found');

    const ownerId = await getResourceOwner(
      permission.resourceType,
      permission.resourceId.toString()
    );
    if (ownerId !== revokedBy) {
      throw new Error('Only the resource owner can revoke access');
    }

    permission.status = 'revoked';
    return await permission.save();
  }

  /**
   * List all active permissions for a resource (owner-only).
   */
  static async listForResource(
    resourceType: ResourceType,
    resourceId: string,
    requestedBy: string
  ): Promise<IPermission[]> {
    const ownerId = await getResourceOwner(resourceType, resourceId);
    if (ownerId !== requestedBy) {
      throw new Error('Only the resource owner can view permissions');
    }

    return await Permission.find({
      resourceType,
      resourceId,
      status: { $ne: 'revoked' },
    })
      .populate('userId', 'name email avatar')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * Get all resource IDs across types that are shared with a user.
   */
  static async getSharedResourceIds(
    userId: string,
    resourceType: ResourceType
  ): Promise<string[]> {
    const permissions = await Permission.find({
      userId,
      resourceType,
      status: 'active',
    }, 'resourceId');
    return permissions.map(p => p.resourceId.toString());
  }

  /**
   * Accept a pending invite (e.g., when user registers with the invited email).
   */
  static async acceptPendingInvites(email: string, userId: string): Promise<number> {
    const result = await Permission.updateMany(
      { email, status: 'pending', userId: { $exists: false } },
      { $set: { userId, status: 'active', acceptedAt: new Date() } }
    );
    return result.modifiedCount;
  }

  /**
   * Get a human-readable name for a resource (for email notifications).
   */
  private static async getResourceName(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<string> {
    const models: Record<ResourceType, any> = {
      space: Space,
      subject: Subject,
      topic: Topic,
      contentBlock: ContentBlock,
      test: Test,
    };
    const Model = models[resourceType];
    if (!Model) return 'Unknown';
    const doc = await Model.findById(resourceId, 'name title question');
    if (!doc) return 'Unknown';
    return doc.name || doc.title || doc.question || resourceId;
  }
}
```

---

## 2.4 ShareLinkService — `server/src/services/share-link.service.ts`

```ts
import ShareLink, { IShareLink, ResourceType } from '@/models/ShareLink.ts';
import Permission from '@/models/Permission.ts';

export class ShareLinkService {

  /**
   * Create a new shareable link for a resource (viewer only).
   */
  static async create(params: {
    resourceType: ResourceType;
    resourceId: string;
    createdBy: string;
    expiresAt?: Date;
    maxUses?: number;
  }): Promise<IShareLink> {
    const { resourceType, resourceId, createdBy, expiresAt, maxUses } = params;

    // Verify creator owns the resource
    const Space = (await import('@/models/Space.ts')).default;
    const Subject = (await import('@/models/Subject.ts')).default;
    const Topic = (await import('@/models/Topic.ts')).default;
    const ContentBlock = (await import('@/models/ContentBlock.ts')).default;
    const Test = (await import('@/models/Test.ts')).default;

    const models: Record<string, any> = {
      space: Space, subject: Subject, topic: Topic, contentBlock: ContentBlock, test: Test,
    };
    const Model = models[resourceType];
    const doc = await Model.findById(resourceId, 'userId');
    if (!doc || doc.userId.toString() !== createdBy) {
      throw new Error('Only the resource owner can create share links');
    }

    const link = await ShareLink.create({
      resourceType,
      resourceId,
      createdBy,
      expiresAt,
      maxUses,
    });

    return link;
  }

  /**
   * Resolve a share link by its hash.
   */
  static async resolve(hash: string): Promise<{
    resourceType: ResourceType;
    resourceId: string;
  }> {
    const link = await ShareLink.findOne({ hash, isActive: true });
    if (!link) throw new Error('Share link not found or deactivated');

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new Error('Share link has expired');
    }

    if (link.maxUses && link.useCount >= link.maxUses) {
      throw new Error('Share link has reached maximum uses');
    }

    link.useCount += 1;
    if (link.maxUses && link.useCount >= link.maxUses) {
      link.isActive = false;
    }
    await link.save();

    return {
      resourceType: link.resourceType,
      resourceId: link.resourceId.toString(),
    };
  }

  /**
   * Redeem a share link for a specific user — grants viewer access.
   */
  static async redeem(hash: string, userId: string): Promise<void> {
    const { resourceType, resourceId } = await ShareLinkService.resolve(hash);

    // Check if user already has access
    const PermissionService = (await import('@/services/permission.service.ts')).PermissionService;
    const hasAccess = await PermissionService.hasAccess(userId, resourceType, resourceId);
    if (hasAccess) return;

    // Create viewer permission
    await Permission.findOneAndUpdate(
      { resourceType, resourceId, userId, grantType: 'link' },
      {
        $set: {
          status: 'active',
          grantType: 'link',
          linkHash: hash,
        },
        $setOnInsert: {
          invitedBy: userId, // self-redeemed
        },
      },
      { upsert: true }
    );
  }

  /**
   * List all active share links for a resource (owner-only).
   */
  static async listForResource(
    resourceType: ResourceType,
    resourceId: string,
    requestedBy: string
  ): Promise<IShareLink[]> {
    const Space = (await import('@/models/Space.ts')).default;
    const Subject = (await import('@/models/Subject.ts')).default;
    const Topic = (await import('@/models/Topic.ts')).default;
    const ContentBlock = (await import('@/models/ContentBlock.ts')).default;
    const Test = (await import('@/models/Test.ts')).default;
    const models: Record<string, any> = {
      space: Space, subject: Subject, topic: Topic, contentBlock: ContentBlock, test: Test,
    };
    const Model = models[resourceType];
    const doc = await Model.findById(resourceId, 'userId');
    if (!doc || doc.userId.toString() !== requestedBy) {
      throw new Error('Only the resource owner can view share links');
    }

    return await ShareLink.find({ resourceType, resourceId, isActive: true })
      .sort({ createdAt: -1 });
  }

  /**
   * Deactivate a share link (owner-only).
   */
  static async deactivate(linkId: string, userId: string): Promise<IShareLink | null> {
    const link = await ShareLink.findById(linkId);
    if (!link) throw new Error('Share link not found');

    const Space = (await import('@/models/Space.ts')).default;
    const Subject = (await import('@/models/Subject.ts')).default;
    const Topic = (await import('@/models/Topic.ts')).default;
    const ContentBlock = (await import('@/models/ContentBlock.ts')).default;
    const Test = (await import('@/models/Test.ts')).default;
    const models: Record<string, any> = {
      space: Space, subject: Subject, topic: Topic, contentBlock: ContentBlock, test: Test,
    };
    const Model = models[link.resourceType];
    const doc = await Model.findById(link.resourceId, 'userId');
    if (!doc || doc.userId.toString() !== userId) {
      throw new Error('Only the resource owner can deactivate share links');
    }

    link.isActive = false;
    return await link.save();
  }
}
```

---

## 2.5 ImportService — `server/src/services/import.service.ts`

```ts
import Space, { ISpace } from '@/models/Space.ts';
import Subject, { ISubject } from '@/models/Subject.ts';
import Topic, { ITopic } from '@/models/Topic.ts';
import ContentBlock, { IContentBlock } from '@/models/ContentBlock.ts';
import Permission from '@/models/Permission.ts';
import { PermissionService } from '@/services/permission.service.ts';

export class ImportService {

  /**
   * Import a shared Space into the user's own workspace.
   * Deep-copies: Space → Subjects → Topics → ContentBlocks.
   */
  static async importSpace(userId: string, spaceId: string): Promise<ISpace> {
    const hasAccess = await PermissionService.hasAccess(userId, 'space', spaceId);
    if (!hasAccess) throw new Error('Access denied');

    const original = await Space.findById(spaceId);
    if (!original) throw new Error('Space not found');

    const newSpace = await Space.create({
      name: `${original.name} (imported)`,
      description: original.description,
      icon: original.icon,
      slug: undefined,
      userId,
    });

    const subjects = await Subject.find({ spaceId });
    for (const subject of subjects) {
      const newSubject = await Subject.create({
        title: subject.title,
        icon: subject.icon,
        position: subject.position,
        spaceId: newSpace._id,
        userId,
      });

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

  /**
   * Import a shared Subject into a user-specified Space.
   */
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

    const newSubject = await Subject.create({
      title: original.title,
      icon: original.icon,
      position: await Subject.countDocuments({ spaceId: targetSpaceId }),
      spaceId: targetSpaceId,
      userId,
    });

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

  /**
   * Import a shared Topic into a user-specified Subject.
   */
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

    const newTopic = await Topic.create({
      title: original.title,
      icon: original.icon,
      position: await Topic.countDocuments({ subjectId: targetSubjectId }),
      subjectId: targetSubjectId,
      userId,
    });

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

  /**
   * Take a shared test — creates a new Test copy for the user.
   */
  static async takeTest(userId: string, testId: string): Promise<any> {
    const Test = (await import('@/models/Test.ts')).default;
    const ContentBlock = (await import('@/models/ContentBlock.ts')).default;

    const hasAccess = await PermissionService.hasAccess(userId, 'test', testId);
    if (!hasAccess) throw new Error('Access denied');

    const original = await Test.findById(testId);
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

    const newTest = await Test.create({
      userId,
      config: { ...original.config.toObject?.() ?? original.config },
      questions,
      status: 'IN_PROGRESS',
      score: 0,
      totalMarks: original.totalMarks,
      startTime: new Date(),
    });

    return newTest;
  }
}
```

---

## 2.6 Permission Controller — `server/src/controllers/permission.controller.ts`

```ts
import type { Request, Response } from 'express';
import type { IUser } from '@/models/User.ts';
import { PermissionService } from '@/services/permission.service.ts';
import { ShareLinkService } from '@/services/share-link.service.ts';
import { ImportService } from '@/services/import.service.ts';
import { createPermissionSchema } from '@/models/Permission.ts';
import { createShareLinkSchema } from '@/models/ShareLink.ts';
import { z } from 'zod';
import Permission from '@/models/Permission.ts';

export class PermissionController {

  // ── Grant Access ──

  static async grant(req: Request, res: Response): Promise<void> {
    try {
      const data = createPermissionSchema.parse(req.body);
      const user = req.user as IUser;
      const permission = await PermissionService.grant({
        ...data,
        invitedBy: (user._id as any).toString(),
      });
      res.status(201).json(permission);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: error.issues });
        return;
      }
      if (error.message === 'Only the resource owner can share content' ||
          error.message === 'User already has access to this resource') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error granting access', error });
    }
  }

  // ── List Permissions (owner only) ──

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { resourceType, resourceId } = req.query;

      if (!resourceType || !resourceId) {
        res.status(400).json({ message: 'resourceType and resourceId are required' });
        return;
      }

      const permissions = await PermissionService.listForResource(
        resourceType as any,
        resourceId as string,
        (user._id as any).toString()
      );
      res.json(permissions);
    } catch (error: any) {
      if (error.message === 'Only the resource owner can view permissions') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error listing permissions', error });
    }
  }

  // ── Revoke Access ──

  static async revoke(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const permission = await PermissionService.revoke(
        req.params.id, (user._id as any).toString()
      );
      if (!permission) { res.status(404).json({ message: 'Permission not found' }); return; }
      res.json({ message: 'Access revoked', permission });
    } catch (error: any) {
      if (error.message === 'Only the resource owner can revoke access') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error revoking access', error });
    }
  }

  // ── Share Links ──

  static async createShareLink(req: Request, res: Response): Promise<void> {
    try {
      const data = createShareLinkSchema.parse(req.body);
      const user = req.user as IUser;
      const link = await ShareLinkService.create({
        ...data,
        createdBy: (user._id as any).toString(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      });
      res.status(201).json({
        ...link.toObject(),
        url: `${process.env.CLIENT_URL}/shared/${link.hash}`,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: error.issues });
        return;
      }
      if (error.message === 'Only the resource owner can create share links') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error creating share link', error });
    }
  }

  static async listShareLinks(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { resourceType, resourceId } = req.query;

      if (!resourceType || !resourceId) {
        res.status(400).json({ message: 'resourceType and resourceId are required' });
        return;
      }

      const links = await ShareLinkService.listForResource(
        resourceType as any,
        resourceId as string,
        (user._id as any).toString()
      );
      res.json(links.map(l => ({
        ...l.toObject(),
        url: `${process.env.CLIENT_URL}/shared/${l.hash}`,
      })));
    } catch (error: any) {
      if (error.message === 'Only the resource owner can view share links') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error listing share links', error });
    }
  }

  static async deactivateShareLink(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const link = await ShareLinkService.deactivate(
        req.params.id, (user._id as any).toString()
      );
      if (!link) { res.status(404).json({ message: 'Share link not found' }); return; }
      res.json({ message: 'Share link deactivated', link });
    } catch (error: any) {
      if (error.message === 'Only the resource owner can deactivate share links') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error deactivating share link', error });
    }
  }

  // ── Public Link Resolution ──

  static async resolveShareLink(req: Request, res: Response): Promise<void> {
    try {
      const { hash } = req.params;
      const resolved = await ShareLinkService.resolve(hash);
      res.json(resolved);
    } catch (error: any) {
      if (error.message.includes('not found') ||
          error.message.includes('expired') ||
          error.message.includes('maximum uses')) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error resolving share link', error });
    }
  }

  static async redeemShareLink(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { hash } = req.params;
      await ShareLinkService.redeem(hash, (user._id as any).toString());
      res.json({ message: 'Access granted via share link' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  // ── Shared Resources ──

  static async getSharedResources(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const userId = (user._id as any).toString();

      const permissions = await Permission.find({ userId, status: 'active' })
        .populate('invitedBy', 'name email avatar')
        .sort({ createdAt: -1 });

      const grouped: Record<string, any[]> = {
        space: [], subject: [], topic: [], contentBlock: [], test: [],
      };

      const modelMap: Record<string, any> = {
        space: (await import('@/models/Space.ts')).default,
        subject: (await import('@/models/Subject.ts')).default,
        topic: (await import('@/models/Topic.ts')).default,
        test: (await import('@/models/Test.ts')).default,
      };

      for (const perm of permissions) {
        const Model = modelMap[perm.resourceType];
        if (!Model) continue;

        const resource = await Model.findById(perm.resourceId, 'name title slug question').lean();
        if (!resource) continue;

        grouped[perm.resourceType].push({
          permissionId: perm._id,
          resourceId: perm.resourceId,
          resource,
          sharedBy: perm.invitedBy,
          sharedAt: perm.createdAt,
        });
      }

      res.json(grouped);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching shared resources', error });
    }
  }

  static async getSharedTest(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const testId = req.params.id;
      const Test = (await import('@/models/Test.ts')).default;

      const hasAccess = await PermissionService.hasAccess(
        (user._id as any).toString(), 'test', testId
      );
      if (!hasAccess) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      const test = await Test.findById(testId)
        .select('-questions.userAnswer -questions.isCorrect -questions.marksObtained -score -warnings');

      if (!test) {
        res.status(404).json({ message: 'Test not found' });
        return;
      }

      res.json(test);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching shared test', error });
    }
  }

  // ── Import / Take Test ──

  static async importSpace(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const space = await ImportService.importSpace(
        (user._id as any).toString(), req.params.id
      );
      res.status(201).json(space);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error importing space', error });
    }
  }

  static async importSubject(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { targetSpaceId } = req.body;

      if (!targetSpaceId) {
        res.status(400).json({ message: 'targetSpaceId is required' });
        return;
      }

      const subject = await ImportService.importSubject(
        (user._id as any).toString(), req.params.id, targetSpaceId
      );
      res.status(201).json(subject);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error importing subject', error });
    }
  }

  static async importTopic(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { targetSubjectId } = req.body;

      if (!targetSubjectId) {
        res.status(400).json({ message: 'targetSubjectId is required' });
        return;
      }

      const topic = await ImportService.importTopic(
        (user._id as any).toString(), req.params.id, targetSubjectId
      );
      res.status(201).json(topic);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error importing topic', error });
    }
  }

  static async takeTest(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const test = await ImportService.takeTest(
        (user._id as any).toString(), req.params.id
      );
      res.status(201).json(test);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Error taking test', error });
    }
  }
}
```

---

## 2.7 Routes — `server/src/routes/permission.routes.ts`

```ts
import { Router } from 'express';
import { PermissionController } from '@/controllers/permission.controller.ts';
import { authMiddleware } from '@/middleware/auth.middleware.ts';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// ── Permission Management (owner only) ──
router.post('/permissions', PermissionController.grant);
router.get('/permissions', PermissionController.list);
router.delete('/permissions/:id', PermissionController.revoke);

// ── Share Links ──
router.post('/share-links', PermissionController.createShareLink);
router.get('/share-links', PermissionController.listShareLinks);
router.delete('/share-links/:id', PermissionController.deactivateShareLink);

// ── Import / Clone ──
router.post('/import/space/:id', PermissionController.importSpace);
router.post('/import/subject/:id', PermissionController.importSubject);
router.post('/import/topic/:id', PermissionController.importTopic);
router.post('/import/test/:id/take', PermissionController.takeTest);

// ── Shared Resources ──
router.get('/me/shared-resources', PermissionController.getSharedResources);
router.get('/shared/tests/:id', PermissionController.getSharedTest);

export default router;
```

### Public link resolution route (separate file or mounted separately)

```ts
// In server/src/index.ts or a separate public routes file:
import { Router } from 'express';
import { ShareLinkService } from '@/services/share-link.service.ts';

const publicRouter = Router();

publicRouter.get('/shared/:hash', async (req, res) => {
  try {
    const resolved = await ShareLinkService.resolve(req.params.hash);
    res.json(resolved);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
});

// Redeem requires auth
import { authMiddleware } from '@/middleware/auth.middleware.ts';
publicRouter.post('/shared/:hash/redeem', authMiddleware, async (req, res) => {
  try {
    const user = req.user as any;
    await ShareLinkService.redeem(req.params.hash, (user._id as any).toString());
    res.json({ message: 'Access granted via share link' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
```

---

## 2.8 Server Entry — Update `server/src/index.ts`

```ts
import permissionRoutes from '@/routes/permission.routes.ts';
app.use('/api', permissionRoutes);

// Public share link resolver (no auth):
import { Router } from 'express';
import { ShareLinkService } from '@/services/share-link.service.ts';
const publicRouter = Router();
publicRouter.get('/shared/:hash', async (req, res) => {
  try {
    const resolved = await ShareLinkService.resolve(req.params.hash);
    res.json(resolved);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
});
app.use('/api', publicRouter);
```

---

## 2.9 Refactor Existing Services

### SpaceService.findAll() — Include shared resources

```ts
static async findAll(userId: string): Promise<any[]> {
  const sharedIds = await PermissionService.getSharedResourceIds(userId, 'space');

  const spaces = await Space.find({
    $or: [
      { userId },
      { _id: { $in: sharedIds } },
    ],
  }, '_id name description slug icon subjectCount userId').sort({ createdAt: -1 });

  return spaces.map(s => ({
    ...s.toObject(),
    isOwner: s.userId.toString() === userId,
  }));
}
```

### SpaceService.findOne() — Use hasAccess

```ts
static async findOne(userId: string, identifier: string): Promise<ISpace | null> {
  const query = Types.ObjectId.isValid(identifier)
    ? { _id: identifier }
    : { slug: identifier };

  const space = await Space.findOne(query, '_id name description slug icon userId');
  if (!space) return null;

  const hasAccess = await PermissionService.hasAccess(userId, 'space', space._id.toString());
  if (!hasAccess) return null;

  return space;
}
```

### Same pattern for SubjectService, TopicService, ContentService, TestService

Every `findOne()` and `findAll()` method needs to:
1. Check `hasAccess` instead of raw `userId` checking
2. Include shared resource IDs in `findAll()` queries

---

## 2.10 Frontend Types — `client/src/types/permissions.ts`

```ts
export type ResourceType = 'space' | 'subject' | 'topic' | 'contentBlock' | 'test';
export type GrantType = 'invite' | 'link';

export interface Permission {
  _id: string;
  resourceType: ResourceType;
  resourceId: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  email?: string;
  grantType: GrantType;
  invitedBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'active' | 'pending' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

export interface ShareLink {
  _id: string;
  resourceType: ResourceType;
  resourceId: string;
  hash: string;
  url: string;
  useCount: number;
  maxUses?: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SharedResource {
  permissionId: string;
  resourceId: string;
  resource: {
    _id: string;
    name?: string;
    title?: string;
    slug: string;
    question?: string;
  };
  sharedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  sharedAt: string;
}

export interface SharedResourcesGrouped {
  space: SharedResource[];
  subject: SharedResource[];
  topic: SharedResource[];
  contentBlock: SharedResource[];
  test: SharedResource[];
}
```

---

## 2.11 Frontend API Service — `client/src/lib/permissions.ts`

```ts
import { api } from '@/lib/api.ts';
import type {
  Permission,
  ShareLink,
  SharedResourcesGrouped,
  ResourceType,
} from '@/types/permissions.ts';

const BASE = '/api';

// ── Permission Management (owner only) ──

export async function grantAccess(params: {
  resourceType: ResourceType;
  resourceId: string;
  email?: string;
  userId?: string;
}): Promise<Permission> {
  const { data } = await api.post(`${BASE}/permissions`, params);
  return data;
}

export async function listPermissions(
  resourceType: ResourceType,
  resourceId: string
): Promise<Permission[]> {
  const { data } = await api.get(`${BASE}/permissions`, {
    params: { resourceType, resourceId },
  });
  return data;
}

export async function revokeAccess(permissionId: string): Promise<void> {
  await api.delete(`${BASE}/permissions/${permissionId}`);
}

// ── Share Links ──

export async function createShareLink(params: {
  resourceType: ResourceType;
  resourceId: string;
  expiresAt?: string;
  maxUses?: number;
}): Promise<ShareLink> {
  const { data } = await api.post(`${BASE}/share-links`, params);
  return data;
}

export async function listShareLinks(
  resourceType: ResourceType,
  resourceId: string
): Promise<ShareLink[]> {
  const { data } = await api.get(`${BASE}/share-links`, {
    params: { resourceType, resourceId },
  });
  return data;
}

export async function deactivateShareLink(linkId: string): Promise<void> {
  await api.delete(`${BASE}/share-links/${linkId}`);
}

// ── Import / Clone ──

export async function importSpace(spaceId: string): Promise<any> {
  const { data } = await api.post(`${BASE}/import/space/${spaceId}`);
  return data;
}

export async function importSubject(subjectId: string, targetSpaceId: string): Promise<any> {
  const { data } = await api.post(`${BASE}/import/subject/${subjectId}`, { targetSpaceId });
  return data;
}

export async function importTopic(topicId: string, targetSubjectId: string): Promise<any> {
  const { data } = await api.post(`${BASE}/import/topic/${topicId}`, { targetSubjectId });
  return data;
}

export async function takeSharedTest(testId: string): Promise<any> {
  const { data } = await api.post(`${BASE}/import/test/${testId}/take`);
  return data;
}

// ── Shared Resources ──

export async function getSharedResources(): Promise<SharedResourcesGrouped> {
  const { data } = await api.get(`${BASE}/me/shared-resources`);
  return data;
}

export async function getSharedTest(testId: string): Promise<any> {
  const { data } = await api.get(`${BASE}/shared/tests/${testId}`);
  return data;
}

// ── Share Link Redemption ──

export async function resolveShareLink(hash: string): Promise<any> {
  const { data } = await api.get(`/api/shared/${hash}`);
  return data;
}

export async function redeemShareLink(hash: string): Promise<void> {
  await api.post(`/api/shared/${hash}/redeem`);
}
```

---

## 2.12 SharedWithMe Page — `client/src/pages/SharedWithMe.tsx`

```tsx
import { useState, useEffect } from 'react';
import { getSharedResources, importSpace, importSubject, importTopic, takeSharedTest } from '@/lib/permissions.ts';
import { Button } from '@/components/UI/Button.tsx';
import { Card } from '@/components/UI/Card.tsx';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { SharedResourcesGrouped } from '@/types/permissions.ts';

function SharedWithMe() {
  const [resources, setResources] = useState<SharedResourcesGrouped | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getSharedResources()
      .then(setResources)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleImport = async (type: string, id: string) => {
    try {
      if (type === 'space') await importSpace(id);
      else if (type === 'subject') {
        const targetSpaceId = prompt('Enter target Space ID:');
        if (!targetSpaceId) return;
        await importSubject(id, targetSpaceId);
      } else if (type === 'topic') {
        const targetSubjectId = prompt('Enter target Subject ID:');
        if (!targetSubjectId) return;
        await importTopic(id, targetSubjectId);
      }
      toast.success('Imported successfully!');
    } catch (err) {
      toast.error('Import failed');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Shared With Me</h1>

      {Object.entries(resources || {}).map(([type, items]) =>
        items.length > 0 ? (
          <section key={type} className="mb-8">
            <h2 className="text-lg font-semibold capitalize mb-3">{type}s</h2>
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.permissionId} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">
                      {item.resource.name || item.resource.title || 'Untitled'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Shared by {item.sharedBy.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() =>
                      type === 'test'
                        ? navigate(`/shared/tests/${item.resourceId}`)
                        : navigate(`/spaces/${item.resource.slug}`)
                    }>
                      View
                    </Button>
                    {type === 'test' ? (
                      <Button onClick={() => handleImport('test', item.resourceId)}>
                        Start Test
                      </Button>
                    ) : (
                      <Button onClick={() => handleImport(type, item.resourceId)}>
                        Clone
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ) : null
      )}

      {Object.values(resources || {}).every(arr => arr.length === 0) && (
        <p className="text-gray-500">Nothing shared with you yet.</p>
      )}
    </div>
  );
}
```

---

## 2.13 Navbar & App Router Updates

### `client/src/components/common/Navbar.tsx`

```tsx
<NavLink to="/shared-with-me">
  <Share2Icon className="w-4 h-4" />
  <span>Shared</span>
</NavLink>
```

### `client/src/App.tsx`

```tsx
<Route path="/shared-with-me" element={<SharedWithMe />} />
```

---

## Permission Inheritance Rules

```
Space shared as "viewer"
  └─ Subjects → viewer (inherited)
      └─ Topics → viewer (inherited)
          └─ ContentBlocks → viewer (inherited)

Owner always has full access.
```

---

## Access Matrix

| Action | Owner | Viewer |
|---|---|---|
| View content | ✅ | ✅ |
| Take tests from shared content | ✅ | ✅ |
| Clone/Import (create own copy) | ✅ | ✅ |
| Share with others | ✅ (invite or link) | ❌ |
| Remove others' access | ✅ | ❌ |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/permissions` | Required | Grant view access to user/email |
| `GET` | `/api/permissions` | Required | List permissions for a resource (owner) |
| `DELETE` | `/api/permissions/:id` | Required | Revoke access (owner) |
| `POST` | `/api/share-links` | Required | Create viewer share link |
| `GET` | `/api/share-links` | Required | List share links (owner) |
| `DELETE` | `/api/share-links/:id` | Required | Deactivate share link (owner) |
| `GET` | `/api/shared/:hash` | Public | Resolve share link |
| `POST` | `/api/shared/:hash/redeem` | Required | Redeem share link |
| `GET` | `/api/me/shared-resources` | Required | List all shared resources |
| `GET` | `/api/shared/tests/:id` | Required | View shared test |
| `POST` | `/api/import/space/:id` | Required | Clone space |
| `POST` | `/api/import/subject/:id` | Required | Clone subject |
| `POST` | `/api/import/topic/:id` | Required | Clone topic |
| `POST` | `/api/import/test/:id/take` | Required | Take shared test |

---

## File Manifest

### Phase 1 — Modified

| File | Change |
|---|---|
| `server/src/models/Subject.ts` | Add `userId` field + `{ userId: 1, spaceId: 1 }` index |
| `server/src/models/Topic.ts` | Add `userId` field + `{ userId: 1, subjectId: 1 }` index |
| `server/src/models/ContentBlock.ts` | Add `userId` field + `{ userId: 1, topicId: 1 }` index |
| `server/src/services/subject.service.ts` | `create()` passes `userId`; `checkOwnership/findOne/update/delete` use direct query |
| `server/src/services/topic.service.ts` | Same pattern |
| `server/src/services/content.service.ts` | Same pattern + `createMany()` passes `userId`; add `checkOwnership()` method |

### Phase 1 — New

| File | Purpose |
|---|---|
| `server/scripts/backfill-userIds.ts` | Backfill `userId` on existing documents by traversing hierarchy |

### Phase 2 — New

| File | Purpose |
|---|---|
| `server/src/models/Permission.ts` | Permission schema (viewer-only, no role) |
| `server/src/models/ShareLink.ts` | ShareLink schema (viewer-only) |
| `server/src/services/permission.service.ts` | `hasAccess`, `grant`, `revoke`, `listForResource`, `getSharedResourceIds`, `acceptPendingInvites` |
| `server/src/services/share-link.service.ts` | `create`, `resolve`, `redeem`, `listForResource`, `deactivate` |
| `server/src/services/import.service.ts` | `importSpace`, `importSubject`, `importTopic`, `takeTest` |
| `server/src/controllers/permission.controller.ts` | All request handlers |
| `server/src/routes/permission.routes.ts` | All route definitions |
| `client/src/types/permissions.ts` | Permission, ShareLink, SharedResource, SharedResourcesGrouped types |
| `client/src/lib/permissions.ts` | All API functions |
| `client/src/pages/SharedWithMe.tsx` | Shared resources page (View + Clone) |

### Phase 2 — Modified

| File | Change |
|---|---|
| `server/src/index.ts` | Mount permission routes + public share link resolver |
| `server/src/services/space.service.ts` | `findAll` includes shared spaces; `findOne` uses `hasAccess` |
| `server/src/services/subject.service.ts` | Same pattern |
| `server/src/services/topic.service.ts` | Same pattern |
| `server/src/services/content.service.ts` | `findAll`/`findOne` use `hasAccess` |
| `server/src/services/test.service.ts` | `findAll`/`findOne` use `hasAccess` |
| `client/src/App.tsx` | Add `/shared-with-me` route |
| `client/src/components/common/Navbar.tsx` | Add "Shared" nav link |

---

## Implementation Order

```
Phase 1: userId denormalization
  ├── 1.1 Add userId to Subject model + index
  ├── 1.2 Add userId to Topic model + index
  ├── 1.3 Add userId to ContentBlock model + index
  ├── 1.4 Update SubjectService (create, checkOwnership, findOne, update, delete)
  ├── 1.5 Update TopicService (create, checkOwnership, findOne, update, delete)
  ├── 1.6 Update ContentService (create, createMany, add checkOwnership)
  └── 1.7 Write + run backfill-userIds.ts

Phase 2: View-only sharing system
  ├── 2.1 Create Permission model + Zod schemas (no role field)
  ├── 2.2 Create ShareLink model + Zod schemas (viewer-only)
  ├── 2.3 Create PermissionService (hasAccess, grant, revoke, etc.)
  ├── 2.4 Create ShareLinkService
  ├── 2.5 Create ImportService
  ├── 2.6 Create permission controller
  ├── 2.7 Create permission routes
  ├── 2.8 Mount routes in server/src/index.ts
  ├── 2.9 Refactor SpaceService (findAll, findOne)
  ├── 2.10 Refactor SubjectService (findAll, findOne)
  ├── 2.11 Refactor TopicService (findAll, findOne)
  ├── 2.12 Refactor ContentService (findAll, findOne)
  ├── 2.13 Refactor TestService (findAll, findOne)
  ├── 2.14 Create client/src/types/permissions.ts
  ├── 2.15 Create client/src/lib/permissions.ts
  ├── 2.16 Create SharedWithMe page
  ├── 2.17 Add /shared-with-me route in App.tsx
  └── 2.18 Add "Shared" link in Navbar
```

---

## Error Handling Summary

| Scenario | HTTP Status | Message |
|---|---|---|
| Unauthenticated request | 401 | Authentication required |
| No access to resource | 403 | Access denied |
| Non-owner tries to share | 403 | Only the resource owner can share content |
| Non-owner tries to revoke | 403 | Only the resource owner can revoke access |
| Duplicate share | 403 | User already has access to this resource |
| Share link invalid/expired | 404 | Share link not found / expired / reached max uses |
| Validation error | 400 | Validation failed + issues array |
| Target space/subject not found | 404 | Not found or not owned by you |
| Server error | 500 | Error message |
