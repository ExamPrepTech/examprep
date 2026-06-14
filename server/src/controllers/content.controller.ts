
import type { Request, Response } from 'express';
import { ContentService } from '@/services/content.service.ts';
import { z } from 'zod';
import type { IUser } from '@/models/User.ts';
import { ContentBlockType } from '@/models/ContentBlock.ts';

// Basic Zod schema for ContentBlock - can be improved with discriminated unions
const createContentSchema = z.object({
  topicId: z.string().min(1, 'Topic ID is required'),
  theme: z.string().optional(),
  kind: z.enum(ContentBlockType),
  content: z.string().optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  explanation: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  group: z.string().optional(),
  hints: z.array(z.string()).optional(),
  blankAnswers: z.array(z.string()).optional(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
  })).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  position: z.number().optional(),
});

const updateContentSchema = z.object({
  kind: z.enum(ContentBlockType).optional(),
  content: z.string().optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
  explanation: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  group: z.string().optional(),
  hints: z.array(z.string()).optional(),
  blankAnswers: z.array(z.string()).optional(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
  })).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  position: z.number().optional(),
});

export class ContentController {

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createContentSchema.parse(req.body);
      const user = req.user as IUser;
      const block = await ContentService.create((user._id as any).toString(), validatedData as any);
      res.status(201).json(block);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: (error as z.ZodError).issues });
        return;
      }
      if (error.message === 'Access denied to topic') {
        res.status(403).json({ message: 'Access denied to topic' });
        return;
      }
      res.status(500).json({ message: 'Error creating content block', error });
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { types, tags, search } = req.query;

      const filterOptions: { types?: string[]; tags?: string[]; search?: string } = {};

      if (types) {
        const typeList = (typeof types === 'string' ? types.split(',') : types as string[])
          .map(t => t.trim())
          .filter(t => t.length > 0);

        if (typeList.length > 0) {
          filterOptions.types = typeList;
        }
      }

      if (tags) {
        const tagList = (typeof tags === 'string' ? tags.split(',') : tags as string[])
          .map(t => t.trim())
          .filter(t => t.length > 0);

        if (tagList.length > 0) {
          filterOptions.tags = tagList;
        }
      }

      if (search) {
        filterOptions.search = search as string;
      }

      const cursor = req.query.cursor ? (req.query.cursor as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await ContentService.findAll(
        (user._id as any).toString(),
        req.params.topicId as string,
        {
          ...filterOptions,
          limit,
          ...(cursor ? { cursor } : {})
        }
      );
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Access denied to topic') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error fetching content blocks', error });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = updateContentSchema.parse(req.body);
      const user = req.user as IUser;
      const block = await ContentService.update((user._id as any).toString(), req.params.id as string, validatedData as any);

      if (!block) {
        res.status(404).json({ message: 'Content block not found' });
        return;
      }
      res.json(block);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: (error as z.ZodError).issues });
        return;
      }
      if (error.message === 'Access denied') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error updating content block', error });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const block = await ContentService.delete((user._id as any).toString(), req.params.id as string);

      if (!block) {
        res.status(404).json({ message: 'Content block not found' });
        return;
      }
      res.json({ message: 'Content block deleted', block });
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error deleting content block', error });
    }
  }
  static async bulkCreate(req: Request, res: Response): Promise<void> {
    try {
      const { topicId, blocks } = req.body;

      if (!topicId || !Array.isArray(blocks)) {
        res.status(400).json({ message: 'Invalid payload: topicId and blocks array required' });
        return;
      }

      // Basic validation of blocks items could be done here or relied on service/mongoose
      const user = req.user as IUser;
      const createdBlocks = await ContentService.createMany((user._id as any).toString(), topicId, blocks);

      res.status(201).json(createdBlocks);
    } catch (error: any) {
      if (error.message === 'Access denied to topic') {
        res.status(403).json({ message: 'Access denied to topic' });
        return;
      }
      res.status(500).json({ message: 'Error creating content blocks', error });
    }
  }
}
