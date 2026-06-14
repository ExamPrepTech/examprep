import { Router } from 'express';
import { SpaceController } from '@/controllers/space.controller.ts';
import { SubjectController } from '@/controllers/subject.controller.ts';
import { TopicController } from '@/controllers/topic.controller.ts';
import { ContentController } from '@/controllers/content.controller.ts';
import { authMiddleware } from '@/middleware/auth.middleware.ts';

const router: Router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// --- SPACES ---
router.get('/spaces', SpaceController.getAll);
router.post('/spaces', SpaceController.create);
router.get('/spaces/:id', SpaceController.getOne);
router.put('/spaces/:id', SpaceController.update);
router.delete('/spaces/:id', SpaceController.delete);

// --- SUBJECTS ---
router.get('/spaces/:spaceId/subjects', SubjectController.getAll);
router.post('/subjects', SubjectController.create);
router.get('/subjects/:id', SubjectController.getOne);
router.put('/subjects/:id', SubjectController.update);
router.delete('/subjects/:id', SubjectController.delete);

// --- TOPICS ---
router.get('/subjects/:subjectId/topics', TopicController.getAll);
router.post('/topics', TopicController.create);
router.get('/topics/:id', TopicController.getOne);
router.put('/topics/:id', TopicController.update);
router.delete('/topics/:id', TopicController.delete);

// --- CONTENT BLOCKS ---
router.get('/topics/:topicId/content', ContentController.getAll);
router.post('/content/bulk', ContentController.bulkCreate);
router.post('/content', ContentController.create);
router.put('/content/:id', ContentController.update);
router.delete('/content/:id', ContentController.delete);

export default router;

