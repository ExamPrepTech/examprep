
import type { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service.ts';
import type { IUser } from '@/models/User.ts';

export class AuthController {
  
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const { user, token } = await AuthService.register({ name, email, password });
      
      res.status(201).json({
        token,
        user: {
          id: (user as any)._id,
          name: (user as any).name,
          email: (user as any).email,
        },
      });
    } catch (err: any) {
      if (err.message === 'User already exists') {
         res.status(400).json({ message: 'User already exists' });
         return;
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const { user, token } = await AuthService.login(email, password);

      const userData = user.toObject() as any;
      res.status(200).json({
        token,
        user: {
          id: user._id,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
        },
      });
    } catch (err: any) {
      if (err.message === 'Invalid credentials' || err.message === 'Password required' || err.message === 'Use Google login') {
        res.status(400).json({ message: err.message });
        return;
      }
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      res.json(req.user);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async googleCallback(req: Request, res: Response): Promise<void> {
    const user = req.user as IUser;
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

    const token = AuthService.generateToken(user);
    res.redirect(`${CLIENT_URL}/auth-success?token=${token}`);
  }
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }
    try {
      await AuthService.forgotPassword(email);
    } catch (err: any) {
      // Log internally but never reveal whether the account exists.
      console.error('forgotPassword error:', err);
    }
    // Always the same response — prevents account enumeration.
    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;
      const { user, token: jwtToken } = await AuthService.resetPassword(token, password);
      
      const userData = user.toObject() as any;
      res.json({
        token: jwtToken,
        user: {
          id: user._id,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
        }
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message || 'Invalid or expired token' });
    }
  }
}

// Export individual functions for basic compatibility if needed, but router should be updated
export const register = AuthController.register;
export const login = AuthController.login;
export const getMe = AuthController.getMe;
