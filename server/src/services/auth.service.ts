
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User, { type IUser } from '@/models/User.ts';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '@/config/env.ts';
import { mailService } from '@/services/mail/mail.service.ts';
import { passwordResetTemplate } from '@/services/mail/templates/password-reset.ts';

const JWT_SECRET = ENV.JWT_SECRET;

export class AuthService {

  static async register(data: { name: string; email: string; password?: string; googleId?: string; avatar?: string }): Promise<{ user: IUser; token: string }> {
    let user = await User.findOne({ email: data.email });
    if (user) {
      throw new Error('User already exists');
    }

    let hashedPassword = undefined;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 12);
    }

    user = new User({
      ...data,
      password: hashedPassword,
      jwtSecureCode: uuidv4(),
    });
    await user.save();

    const token = this.generateToken(user);
    return { user, token };
  }

  static async login(email: string, password?: string): Promise<{ user: IUser; token: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user has password (local auth)
    const hashedPassword = user.get('password') as string | undefined;
    if (!hashedPassword) {
      throw new Error('Use Google login');
    }

    if (!password) {
      throw new Error('Password required');
    }

    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Rotate security code to invalidate other sessions
    user.jwtSecureCode = uuidv4();
    await user.save();

    const token = this.generateToken(user);
    return { user, token };
  }

  static async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email });
    // Silently succeed for unknown emails to avoid account enumeration.
    if (!user) return;

    // Generate reset token: raw token goes in the email, only its hash is stored.
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.set('resetPasswordToken', hashedToken);
    user.set('resetPasswordExpires', new Date(Date.now() + 10 * 60 * 1000)); // 10 minutes
    await user.save();

    const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${resetToken}`;
    const sent = await mailService.send({ to: email, ...passwordResetTemplate(resetUrl) });

    // In development, surface the link when SMTP isn't configured / failed.
    if (!sent && ENV.NODE_ENV !== 'production') {
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
    }
  }

  static async resetPassword(token: string, newPassword?: string): Promise<{ user: IUser; token: string }> {
    if (!newPassword) throw new Error('Password is required');

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.set('resetPasswordToken', undefined);
    user.set('resetPasswordExpires', undefined);
    // Rotate security code mostly just in case
    user.jwtSecureCode = uuidv4();

    await user.save();

    const jwtToken = this.generateToken(user);
    return { user, token: jwtToken };
  }

  static generateToken(user: IUser): string {
    return jwt.sign(
      { id: (user as any)._id, jwtSecureCode: (user as any).jwtSecureCode },
      JWT_SECRET,
      { expiresIn: '6h' }
    );
  }
}
