import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '@/models/User.ts';
import Space from '@/models/Space.ts';
import Subject from '@/models/Subject.ts';
import Topic from '@/models/Topic.ts';
import ContentBlock, { ContentBlockType } from '@/models/ContentBlock.ts';

// Load env vars from the root .env file (assuming server is in server/ and .env is in root or server/.env)
// Based on previous file explorations, .env is in server/.env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TARGET_USER_ID = '69746ebae050e501c485d050';

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

const getRandomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

// Simple random content generators
const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const randomText = (length: number) => {
    const start = getRandomInt(0, lorem.length - length);
    return lorem.substring(start, start + length) || "Random text";
};

const randomTitle = () => `Title ${Math.random().toString(36).substring(7)}`;

const generateContentBlock = (topicId: mongoose.Types.ObjectId, groupName: string, position: number) => {
    const types = Object.values(ContentBlockType);
    const type = types[getRandomInt(0, types.length - 1)];

    const baseBlock = {
        topicId,
        position,
        kind: type,
        group: groupName,
        tags: [`tag-${Math.random().toString(36).substring(7)}`, `tag-${Math.random().toString(36).substring(7)}`],
        explanation: `Explanation: ${randomText(50)}`,
        notes: `Note: ${randomText(30)}`,
    };

    switch (type) {
        case ContentBlockType.NOTE:
            return {
                ...baseBlock,
                content: `Note content: ${randomText(100)}`,
            };
        case ContentBlockType.SINGLE_SELECT_MCQ:
        case ContentBlockType.MULTI_SELECT_MCQ:
            return {
                ...baseBlock,
                question: `Question: ${randomText(40)}?`,
                options: [
                    { id: 'a', text: `Option A ${Math.random().toString(36).substring(7)}`, isCorrect: true },
                    { id: 'b', text: `Option B ${Math.random().toString(36).substring(7)}`, isCorrect: false },
                    { id: 'c', text: `Option C ${Math.random().toString(36).substring(7)}`, isCorrect: false },
                    { id: 'd', text: `Option D ${Math.random().toString(36).substring(7)}`, isCorrect: false },
                ],
            };
        case ContentBlockType.FILL_IN_THE_BLANK:
            // Generate a sentence with blanks
            const part1 = randomText(20);
            const answer1 = "answer1";
            const part2 = randomText(20);
            const answer2 = "answer2";
            const part3 = randomText(10);
            
            return {
                ...baseBlock,
                question: `${part1} {{blank}} ${part2} {{blank}} ${part3}.`,
                blankAnswers: [answer1, answer2],
                hints: [`Hint 1 for ${answer1}`, `Hint 2 for ${answer2}`],
            };
        default:
            return {
                ...baseBlock,
                data: { info: 'Generic block' },
            };
    }
};

const seedData = async () => {
    await connectDB();

    console.log('Finding user...');
    // We can't be sure if the user ID is an ObjectId or just a string matching. 
    // Assuming standard Mongoose usage, it's an ObjectId string.
    let user;
    try {
        user = await User.findById(TARGET_USER_ID);
    } catch(e) {
        console.log("Invalid User ID format or DB error");
    }
    
    if (!user) {
        console.error(`User with ID ${TARGET_USER_ID} not found! Please create the user first or update the ID in the seed script.`);
        // Optional: Create user if missing? No, user specified this ID.
        // But for robustness, let's just create one if missing to not block me? 
        // No, strict instruction: "only aviable in the db o]id is the 6947a4a4fb83f332d3314cb8"
        process.exit(1);
    }
    console.log(`Found user: ${user.email}`);

    // Create 1 Space
    console.log('Creating Space...');
    const space = await Space.create({
        name: 'Seed Space ' + new Date().toISOString().split('T')[0],
        description: 'Auto-generated space with rich hierarchy',
        userId: user._id,
        slug: `seed-space-${Date.now()}`
    });

    console.log(`Created Space: ${space.name}`);

    // Create 10 Subjects
    for (let i = 1; i <= 10; i++) {
        console.log(`Creating Subject ${i}/10...`);
        const subject = await Subject.create({
            title: `Subject ${i} - ${randomTitle()}`,
            spaceId: space._id,
            position: i,
        });

        // Create 7-8 Topics (Mapped as "Chapters") per Subject
        const numChapters = getRandomInt(7, 8);
        for (let j = 1; j <= numChapters; j++) {
            const topic = await Topic.create({
                title: `Chapter ${j}: ${randomTitle()}`,
                subjectId: subject._id,
                position: j,
            });

            // Create 5-10 Groups (Mapped as "Topics") per Topic (Chapter)
            const numGroups = getRandomInt(5, 10);
            const contentBlocksToInsert = [];

            for (let k = 1; k <= numGroups; k++) {
                const groupName = `Topic ${k} - ${randomTitle()}`;
                
                // Create 15-30 ContentBlocks per Group
                const numBlocks = getRandomInt(15, 30);
                for (let l = 1; l <= numBlocks; l++) {
                    contentBlocksToInsert.push(generateContentBlock(topic._id as mongoose.Types.ObjectId, groupName, (k * 100) + l)); 
                    // Position is hacked to segregate groups roughly if sorted by position, 
                    // or just sequential. Let's make it sequential within group, but groups interleaved? 
                    // No, usually blocks are just list. 
                    // Let's just use simple incrementing position for now.
                }
            }
            
            // Bulk insert is faster
            if (contentBlocksToInsert.length > 0) {
                 await ContentBlock.insertMany(contentBlocksToInsert);
            }
        }
    }

    console.log('Seeding complete!');
    process.exit(0);
};

seedData();
