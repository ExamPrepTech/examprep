import { create } from 'zustand';
import api from '@/lib/api';

import type { SharedUser } from '@shared/index';

interface AuthState {
  user: SharedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: SharedUser, token: string) => void;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<unknown>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  forgotPassword: async (email: string) => {
    try {
      await api.post('/auth/forgot-password', { email });
    } catch (error) {
       console.error('Forgot password error:', error);
       throw error;
    }
  },
  resetPassword: async (token: string, password: string) => {
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      // Automatically log the user in
      const { user, token: newToken } = res.data;
      get().setAuth(user, newToken);
      return res.data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },
}));
