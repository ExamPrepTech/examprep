
import type { Request, Response, NextFunction } from 'express';
import type { IUser } from '@/models/User.ts';

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as IUser;
  
  if (user && user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }
};
