import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Space from '@/models/Space.ts';
import Subject from '@/models/Subject.ts';
import Topic from '@/models/Topic.ts';
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 5);
import slugify from 'slugify';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

async function backfillSlugs() {
    const spaces = await Space.find({});
    for (const space of spaces) {
        const slugifyFn = (slugify as any).default || slugify;
        const baseSlug = slugifyFn(space.name, { lower: true, strict: true }).substring(0, 50);
        const uniquePart = nanoid();
        space.slug = `${baseSlug}-${uniquePart}`;
        await space.save();
    }
    const subjects = await Subject.find({});
    for (const subject of subjects) {
        const slugifyFn = (slugify as any).default || slugify;
        const baseSlug = slugifyFn(subject.title, { lower: true, strict: true }).substring(0, 50);
        const uniquePart = nanoid();
        subject.slug = `${baseSlug}-${uniquePart}`;
        await subject.save();
    }
    const topics = await Topic.find({});
    for (const topic of topics) {
        const slugifyFn = (slugify as any).default || slugify;
        const baseSlug = slugifyFn(topic.title, { lower: true, strict: true }).substring(0, 50);
        const uniquePart = nanoid();
        topic.slug = `${baseSlug}-${uniquePart}`;
        await topic.save();
    }
}
backfillSlugs().then(() => {
    console.log('Slugs backfilled successfully');
    mongoose.connection.close();
}).catch((error) => {
    console.error('Error backfilling slugs:', error);
    mongoose.connection.close();
});
