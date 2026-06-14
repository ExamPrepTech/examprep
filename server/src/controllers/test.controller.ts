import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import TestService from '@/services/test.service.js';

export const getAvailableQuestionCounts = async (req: Request, res: Response) => {
  try {
    const { topicIds } = req.body; // Expecting post body for filtering or query params
    // If strict GET, we should use query params, but array passing is easier in POST or query string parsing

    // Let's assume POST for complex filter, or parsed query params
    // If query params: ?topicIds=id1,id2
    let ids: string[] = [];
    if (req.query.topicIds) {
      ids = (req.query.topicIds as string).split(',');
    } else if (req.body.topicIds) {
      ids = req.body.topicIds;
    }

    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: 'Topic IDs are required' });
    }

    const counts = await TestService.getAvailableQuestionCounts(ids);
    res.json(counts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAvailableTags = async (req: Request, res: Response) => {
  try {
    // Accepts the same scope body as createTest ({ selections } or { topicIds }).
    const tags = await TestService.getAvailableTags(req.body || {});
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTest = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id; // Assumes auth middleware populates req.user
    const config = req.body;

    const test = await TestService.createTest(userId, config);
    res.status(201).json(test);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTests = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const tests = await TestService.getTestsByUser(userId);
    res.json(tests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTestById = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Test ID is required' });
    }

    // Validate ObjectId to prevent CastError
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid Test ID format' });
    }

    const test = await TestService.getTestById(id, userId);

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    res.json(test);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const submitTest = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const { answers, warnings, timeSpent } = req.body;

    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Test ID is required' });
    }
    const test = await TestService.submitTest(id, userId, answers, warnings, timeSpent);
    res.json(test);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const saveProgress = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const { answers, warnings, timeSpent } = req.body;

    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Test ID is required' });
    }

    // Validate ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid Test ID format' });
    }

    const test = await TestService.updateProgress(id, userId, answers, warnings, timeSpent);
    res.json(test);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
