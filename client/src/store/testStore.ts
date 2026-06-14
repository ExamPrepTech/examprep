import { create } from 'zustand';
import api from '@/lib/api';
import type { Test } from '@/types/domain';

interface TestState {
  tests: Test[];
  currentTest: Test | null;
  isLoading: boolean;
  error: string | null;

  fetchTests: () => Promise<void>;
  fetchTest: (id: string) => Promise<void>;
  // For createTest, we might pass config or topic selections
  createTest: (payload: Record<string, unknown>) => Promise<Test>; 
  submitTest: (id: string, payload: { answers: Record<string, unknown>; warnings: unknown[]; timeSpent: Record<string, number> }) => Promise<void>;
  saveProgress: (id: string, payload: { answers: Record<string, unknown>; warnings: unknown[]; timeSpent: Record<string, number> }) => Promise<void>;
  checkAvailability: (topicIds: string[]) => Promise<Record<string, number>>;
  setTest: (test: Test | null) => void;
}

export const useTestStore = create<TestState>((set, get) => ({
  tests: [],
  currentTest: null,
  isLoading: false,
  error: null,

  fetchTests: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<Test[]>('/tests');
      set({ tests: Array.isArray(res.data) ? res.data : [], isLoading: false });
    } catch (error) {
      console.error('Fetch tests error:', error);
      set({ error: 'Failed to fetch tests', isLoading: false });
    }
  },

  fetchTest: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<Test>(`/tests/${id}`);
      set({ currentTest: res.data, isLoading: false });
    } catch (error) {
      console.error('Fetch test error:', error);
      set({ error: 'Failed to fetch test', isLoading: false });
    }
  },

  createTest: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<Test>('/tests', payload);
      const newTest = res.data;
      set(state => ({ 
        tests: [newTest, ...state.tests],
        isLoading: false 
      }));
      return newTest;
    } catch (error) {
      console.error('Create test error:', error);
      set({ error: 'Failed to create test', isLoading: false });
      throw error;
    }
  },

  submitTest: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(`/tests/${id}/submit`, payload);
      // Update the current test with the result
      if (res.data && res.data._id) {
          set({ currentTest: res.data, isLoading: false });
          set(state => ({
              tests: state.tests.map(t => t._id === id ? res.data : t)
          }));
      } else {
          await get().fetchTest(id);
      }

    } catch (error) {
      console.error('Submit test error:', error);
      set({ error: 'Failed to submit test', isLoading: false });
      throw error;
    }
  },

  saveProgress: async (id, payload) => {
      // Don't set global loading state to avoid full screen spinner, or handle UI gracefully
      // But for now, maybe small loading indicator. 
      // If we pause, we are exiting, so maybe loading is fine.
      set({ isLoading: true, error: null });
      try {
          await api.post(`/tests/${id}/progress`, payload);
          set({ isLoading: false });
      } catch (error) {
          console.error('Save progress error:', error);
          set({ error: 'Failed to save progress', isLoading: false });
          throw error;
      }
  },

  checkAvailability: async (topicIds) => {
    try {
      const res = await api.post('/tests/count', { topicIds });
      return res.data;
    } catch (error) {
      console.error('Check availability error:', error);
      throw error;
    }
  },

  setTest: (test) => set({ currentTest: test }),
}));
