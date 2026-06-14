
import passport from 'passport';
import type { Request, Response, NextFunction } from 'express';
import type { IUser } from '@/models/User.ts';

const requireApproval = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  
  if (!user) {
    return next(); // Should be handled by passport, but safe check
  }

  if (user.role !== 'admin' && !user.isApproved) {
     res.status(403).json({ message: 'Account Pending Approval. Please wait until an admin accepts your request.' });
     return;
  }
  
  next();
};

export const authMiddleware = [
  passport.authenticate('jwt', { session: false }),
  requireApproval
];
