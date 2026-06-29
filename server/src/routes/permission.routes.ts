import { Router } from 'express';
import { PermissionController } from '@/controllers/permission.controller.ts';
import { authMiddleware } from '@/middleware/auth.middleware.ts';

const router: Router = Router();

router.use(authMiddleware);

router.post('/permissions', PermissionController.grant);
router.get('/permissions', PermissionController.list);
router.delete('/permissions/:id', PermissionController.revoke);

router.post('/share-links', PermissionController.createShareLink);
router.get('/share-links', PermissionController.listShareLinks);
router.delete('/share-links/:id', PermissionController.deactivateShareLink);

router.post('/import/space/:id', PermissionController.importSpace);
router.post('/import/subject/:id', PermissionController.importSubject);
router.post('/import/topic/:id', PermissionController.importTopic);
router.post('/import/test/:id/take', PermissionController.takeTest);

router.get('/me/shared-resources', PermissionController.getSharedResources);
router.get('/shared/tests/:id', PermissionController.getSharedTest);

router.get('/shared/:hash', PermissionController.resolveShareLink);
router.post('/shared/:hash/redeem', PermissionController.redeemShareLink);

export default router;
