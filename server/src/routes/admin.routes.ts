
import { Router } from 'express';
import { AdminController } from '@/controllers/admin.controller.ts';
import { authMiddleware } from '@/middleware/auth.middleware.ts';
import { isAdmin } from '@/middleware/admin.middleware.ts';

const router: Router = Router();

// Protect all admin routes
router.use(authMiddleware, isAdmin);

router.get('/users', AdminController.getAllUsers);
router.patch('/users/:id/approve', AdminController.updateUserStatus);
router.delete('/users/:id', AdminController.deleteUser);

export default router;
