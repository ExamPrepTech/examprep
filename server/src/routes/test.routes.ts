import express from 'express';
import { authMiddleware as protect } from '@/middleware/auth.middleware.js';
import * as testController from '@/controllers/test.controller.js';

const router: express.Router = express.Router();

router.use(protect); // All test routes need authentication

router.post('/count', testController.getAvailableQuestionCounts); // Using POST to send filter body easily
router.post('/available-tags', testController.getAvailableTags); // Distinct tags within a selection scope
router.post('/', testController.createTest);
router.get('/', testController.getTests);
router.get('/:id', testController.getTestById);
router.post('/:id/submit', testController.submitTest);
router.post('/:id/progress', testController.saveProgress);

export default router;
