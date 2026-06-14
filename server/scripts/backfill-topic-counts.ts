
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

import Space from '@/models/Space.ts';
import Subject from '@/models/Subject.ts';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep';

async function backfillTopicCounts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const spaces = await Space.find({});
    console.log(`Found ${spaces.length} spaces. Starting update...`);

    for (const space of spaces) {
      // Count subjects for this space
      const subjectCount = await Subject.countDocuments({ spaceId: space._id });

      // Update the space
      space.subjectCount = subjectCount;
      await space.save();

      console.log(`Updated space "${space.name}" (${space._id}): ${subjectCount} subjects`);
    }

    console.log('All spaces updated successfully.');
  } catch (error) {
    console.error('Error updating spaces:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

backfillTopicCounts();
