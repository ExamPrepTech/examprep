export interface SharedUser {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
  createdAt?: string | Date;
}
