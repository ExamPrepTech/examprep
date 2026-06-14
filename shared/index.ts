export interface SharedUser {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  isApproved: boolean;
  avatar?: string;
  googleId?: string;
  createdAt?: string | Date;
}
