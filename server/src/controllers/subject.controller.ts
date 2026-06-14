
import type { Request, Response } from 'express';
import { SubjectService } from '@/services/subject.service.ts';
import { z } from 'zod';
import type { IUser } from '@/models/User.ts';

const createSubjectSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  spaceId: z.string().min(1, 'Space ID is required'),
  position: z.number().optional(),
});

const updateSubjectSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  position: z.number().optional(),
});

export class SubjectController {

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createSubjectSchema.parse(req.body);
      const user = req.user as IUser;
      const subject = await SubjectService.create((user._id as any).toString(), validatedData as any);
      res.status(201).json(subject);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: (error as z.ZodError).issues });
        return;
      }
      if (error.message === 'Access denied to space') {
        res.status(403).json({ message: 'Access denied to space' });
        return;
      }
      res.status(500).json({ message: 'Error creating subject', error });
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const subjects = await SubjectService.findAll((user._id as any).toString(), req.params.spaceId as string);
      res.json(subjects);
    } catch (error: any) {
      if (error.message === 'Access denied to space') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error fetching subjects', error });
    }
  }

  static async getOne(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const subject = await SubjectService.findOne((user._id as any).toString(), req.params.id as string);
      
      if (!subject) {
        res.status(404).json({ message: 'Subject not found' });
        return;
      }
      res.json(subject);
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error fetching subject', error });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = updateSubjectSchema.parse(req.body);
      const user = req.user as IUser;
      const subject = await SubjectService.update((user._id as any).toString(), req.params.id as string, validatedData as any);
      
      if (!subject) {
        res.status(404).json({ message: 'Subject not found' });
        return;
      }
      res.json(subject);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: (error as z.ZodError).issues });
        return;
      }
      if (error.message === 'Access denied') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error updating subject', error });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const subject = await SubjectService.delete((user._id as any).toString(), req.params.id as string);
      
      if (!subject) {
        res.status(404).json({ message: 'Subject not found' });
        return;
      }
      res.json({ message: 'Subject deleted', subject });
    } catch (error: any) {
      if (error.message === 'Access denied') {
        res.status(403).json({ message: 'Access denied' });
        return;
      }
      res.status(500).json({ message: 'Error deleting subject', error });
    }
  }
}
