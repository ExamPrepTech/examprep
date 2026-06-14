import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Topic from '@/models/Topic.ts';
import ContentBlock, { ContentBlockType } from '@/models/ContentBlock.ts';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/examprep');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const getRandomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.";

const randomText = (length: number) => {
    const start = getRandomInt(0, Math.max(0, lorem.length - length));
    return lorem.substring(start, start + length) || "Random text";
};

const seedQuestions = async () => {
    await connectDB();

    console.log('Fetching all topics...');
    const topics = await Topic.find({});

    if (topics.length === 0) {
        console.log('No topics found! Please run the initial seed script first.');
        process.exit(1);
    }

    console.log(`Found ${topics.length} topics.`);

    const TARGET_TOTAL_QUESTIONS = 500;
    const QUESTIONS_PER_TOPIC = Math.max(1, Math.floor(TARGET_TOTAL_QUESTIONS / topics.length));

    console.log(`Targeting ~${QUESTIONS_PER_TOPIC} new questions per topic to reach ~${TARGET_TOTAL_QUESTIONS} total.`);

    let totalCreated = 0;

    for (const topic of topics) {
        const blocksToInsert = [];

        // Fetch existing max position
        const lastBlock = await ContentBlock.findOne({ topicId: topic._id }).sort({ position: -1 });
        let startPosition = lastBlock ? lastBlock.position + 1 : 0;

        for (let i = 0; i < QUESTIONS_PER_TOPIC; i++) {
            const questionText = `Question ${randomText(20)}?`;

            blocksToInsert.push({
                topicId: topic._id,
                position: startPosition + i,
                kind: ContentBlockType.SINGLE_SELECT_MCQ, // Mostly MCQ for testing
                group: 'Random Seeded Questions',
                question: questionText,
                options: [
                    { id: 'a', text: `Option A: ${randomText(10)}`, isCorrect: true },
                    { id: 'b', text: `Option B: ${randomText(10)}`, isCorrect: false },
                    { id: 'c', text: `Option C: ${randomText(10)}`, isCorrect: false },
                    { id: 'd', text: `Option D: ${randomText(10)}`, isCorrect: false },
                ],
                explanation: `Explanation: ${randomText(50)}`,
                tags: ['random', 'seed', `batch-${Date.now()}`]
            });
        }

        if (blocksToInsert.length > 0) {
            await ContentBlock.insertMany(blocksToInsert);
            totalCreated += blocksToInsert.length;
            process.stdout.write('.'); // Progress indicator
        }
    }

    console.log(`\nSuccessfully added ${totalCreated} questions across ${topics.length} topics.`);
    process.exit(0);
};

seedQuestions();
