
import type { Request, Response } from 'express';
import { TopicService } from '@/services/topic.service.ts';
import { z } from 'zod';
import type { IUser } from '@/models/User.ts';

const createTopicSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  subjectId: z.string().min(1, 'Subject ID is required'),
  position: z.number().optional(),
});

const updateTopicSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  position: z.number().optional(),
});

export class TopicController {

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createTopicSchema.parse(req.body);
      const user = req.user as IUser;
      const topic = await TopicService.create((user._id as any).toString(), validatedData as any);
      res.status(201).json(topic);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: (error as z.ZodError).issues });
        return;
      }
      if (error.message === 'Access denied to subject') {
        res.status(403).json({ message: 'Access denied to subject' });
        return;
      }
      res.status(500).json({ message: 'Error creating topic', error });
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const topics = await TopicService.findAll((user._id as any).toString(), req.params.subjectId as string);
      res.json(topics);
    } catch (error: any) {
      if (error.message === 'Access denied to subject') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error fetching topics', error });
    }
  }

  static async getOne(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const topic = await TopicService.findOne((user._id as any).toString(), req.params.id as string);
      
      if (!topic) {
        res.status(404).json({ message: 'Topic not found' });
        return;
      }
      res.json(topic);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error fetching topic', error });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = updateTopicSchema.parse(req.body);
      const user = req.user as IUser;
      const topic = await TopicService.update((user._id as any).toString(), req.params.id as string, validatedData as any);
      
      if (!topic) {
        res.status(404).json({ message: 'Topic not found' });
        return;
      }
      res.json(topic);
    } catch (error: any) {
       if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: (error as z.ZodError).issues });
        return;
      }
      if (error.message === 'Access denied') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error updating topic', error });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const topic = await TopicService.delete((user._id as any).toString(), req.params.id as string);
      
      if (!topic) {
        res.status(404).json({ message: 'Topic not found' });
        return;
      }
      res.json({ message: 'Topic deleted', topic });
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error deleting topic', error });
    }
  }
}
