
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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

const syncCounts = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const subjects = await Subject.find({});
        console.log(`Found ${subjects.length} subjects to sync.`);

        for (const subject of subjects) {
            // Find all topics for this subject
            const topics = await Topic.find({ subjectId: subject._id });
            const topicIds = topics.map(t => t._id);

            // Count questions in these topics
            const questionCount = await ContentBlock.countDocuments({
                topicId: { $in: topicIds },
                kind: { $in: ['single_select_mcq', 'multi_select_mcq', 'descriptive'] }
            });

            // Update subject
            if (subject.questionCount !== questionCount) {
                console.log(`Updating ${subject.title}: ${subject.questionCount} -> ${questionCount}`);
                subject.questionCount = questionCount;
                await subject.save();
            } else {
                // console.log(`Skipping ${subject.title}: ${subject.questionCount} is correct.`);
            }

            // Also update topicCount while we are at it
            const topicCount = await Topic.countDocuments({ subjectId: subject._id });
            if (subject.topicCount !== topicCount) {
                console.log(`Updating topic count for ${subject.title}: ${subject.topicCount} -> ${topicCount}`);
                subject.topicCount = topicCount;
                await subject.save();
            }
        }

        console.log('Sync complete.');
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
};

syncCounts();
