
import { Router } from 'express';
import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';
import { AuthController } from '@/controllers/auth.controller.ts';
import { authMiddleware } from '@/middleware/auth.middleware.ts';

const router: Router = Router();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Google Auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login` }),
  AuthController.googleCallback
);

router.get('/me', authMiddleware, AuthController.getMe);

export default router;
