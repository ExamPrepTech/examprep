
import type { Request, Response } from 'express';
import User from '@/models/User.ts';

export class AdminController {
  
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await User.find({ role: { $ne: 'admin' } }, '-password'); // Exclude password and admins
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isApproved } = req.body;
      
      const user = await User.findByIdAndUpdate(
        id, 
        { isApproved }, 
        { new: true }
      ).select('-password');

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(user);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
      try {
          const { id } = req.params;
          await User.findByIdAndDelete(id);
          res.json({ message: 'User deleted successfully' });
      } catch (err) {
          res.status(500).json({ message: 'Server error' });
      }
  }
}
