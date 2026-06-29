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

  const spaces = await Space.find({}, '_id userId');
  const spaceOwner = new Map(spaces.map(s => [s._id.toString(), s.userId.toString()]));
  console.log(`Found ${spaces.length} spaces`);

  const subjects = await Subject.find({ userId: { $exists: false } });
  console.log(`Backfilling ${subjects.length} subjects...`);
  for (const subject of subjects) {
    const userId = spaceOwner.get(subject.spaceId.toString());
    if (userId) {
      subject.userId = userId as any;
      await subject.save();
    }
  }

  const allSubjects = await Subject.find({}, '_id userId');
  const subjectOwner = new Map(allSubjects.map(s => [s._id.toString(), s.userId.toString()]));

  const topics = await Topic.find({ userId: { $exists: false } });
  console.log(`Backfilling ${topics.length} topics...`);
  for (const topic of topics) {
    const userId = subjectOwner.get(topic.subjectId.toString());
    if (userId) {
      topic.userId = userId as any;
      await topic.save();
    }
  }

  const allTopics = await Topic.find({}, '_id userId');
  const topicOwner = new Map(allTopics.map(t => [t._id.toString(), t.userId.toString()]));

  const blocks = await ContentBlock.find({ userId: { $exists: false } });
  console.log(`Backfilling ${blocks.length} content blocks...`);
  for (const block of blocks) {
    const userId = topicOwner.get(block.topicId.toString());
    if (userId) {
      block.userId = userId as any;
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
