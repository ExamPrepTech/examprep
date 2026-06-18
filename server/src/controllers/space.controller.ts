
import type { Request, Response } from 'express';
import { SpaceService } from '@/services/space.service.ts';
import { z } from 'zod';
import type { IUser } from '@/models/User.ts';

// Zod schemas
const createSpaceSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().optional(),
  icon: z.string().optional(),
});

const updateSpaceSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export class SpaceController {
  
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createSpaceSchema.parse(req.body);
      const user = req.user as IUser;

      const space = await SpaceService.create((user._id as any).toString(), validatedData as any);
      res.status(201).json(space);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: (error as z.ZodError).issues });
        return;
      }
      res.status(500).json({ message: 'Error creating space', error });
      console.error('Error creating space:', error);
    }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const spaces = await SpaceService.findAll((user._id as any).toString());
      res.json(spaces);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching spaces', error });
    }
  }

  static async getOne(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const space = await SpaceService.findOne((user._id as any).toString(), req.params.id as string);
      if (!space) {
        res.status(404).json({ message: 'Space not found' });
        return;
      }
      res.json(space);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching space', error });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = updateSpaceSchema.parse(req.body);
      const user = req.user as IUser;
      const space = await SpaceService.update((user._id as any).toString(), req.params.id as string, validatedData as any);
      
      if (!space) {
        res.status(404).json({ message: 'Space not found' });
        return;
      }
      res.json(space);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation failed', errors: (error as z.ZodError).issues });
        return;
      }
      res.status(500).json({ message: 'Error updating space', error });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const space = await SpaceService.delete((user._id as any).toString(), req.params.id as string);
      
      if (!space) {
        res.status(404).json({ message: 'Space not found' });
        return;
      }
      res.json({ message: 'Space deleted', space });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting space', error });
    }
  }
}
