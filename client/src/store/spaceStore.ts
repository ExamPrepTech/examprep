import { create } from 'zustand';
import api from '@/lib/api';
import { type Space } from '@/types/domain';

interface SpaceState {
  spaces: Space[];
  currentSpace: Space | null;
  isLoading: boolean;
  error: string | null;

  fetchSpaces: () => Promise<void>;
  fetchSpace: (id: string) => Promise<void>;
  createSpace: (data: { name: string; description: string; icon?: string }) => Promise<void>;
  updateSpace: (id: string, data: { name: string; description: string; icon?: string }) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  setCurrentSpace: (space: Space | null) => void;
}

export const useSpaceStore = create<SpaceState>((set, get) => ({
  spaces: [],
  currentSpace: null,
  isLoading: false,
  error: null,

  fetchSpaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<Space[]>('/spaces');
      set({ spaces: Array.isArray(res.data) ? res.data : [], isLoading: false });
    } catch (error) {
      console.error('Fetch spaces error:', error);
      set({ error: 'Failed to fetch spaces', isLoading: false });
    }
  },

  fetchSpace: async (id: string) => {
    // If we already have it in the list, use that first for speed
    const existing = get().spaces.find(s => s._id === id || s.slug === id);
    if (existing) {
      set({ currentSpace: existing });
    }

    set({ isLoading: true, error: null });
    try {
      const res = await api.get<Space>(`/spaces/${id}`);
      set({ currentSpace: res.data, isLoading: false });
    } catch (error) {
      console.error('Fetch space error:', error);
      set({ error: 'Failed to fetch space', isLoading: false });
    }
  },

  createSpace: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/spaces', data);
      await get().fetchSpaces();
      set({ isLoading: false });
    } catch (error) {
      console.error('Create space error:', error);
      set({ error: 'Failed to create space', isLoading: false });
      throw error;
    }
  },

  updateSpace: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/spaces/${id}`, data);
      await get().fetchSpaces();
      // If updating current space, refresh it too
      if (get().currentSpace?._id === id) {
        await get().fetchSpace(id);
      }
      set({ isLoading: false });
    } catch (error) {
      console.error('Update space error:', error);
      set({ error: 'Failed to update space', isLoading: false });
      throw error;
    }
  },

  deleteSpace: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/spaces/${id}`);
      await get().fetchSpaces();
      if (get().currentSpace?._id === id) {
        set({ currentSpace: null });
      }
      set({ isLoading: false });
    } catch (error) {
      console.error('Delete space error:', error);
      set({ error: 'Failed to delete space', isLoading: false });
      throw error;
    }
  },

  setCurrentSpace: (space) => set({ currentSpace: space }),
}));
