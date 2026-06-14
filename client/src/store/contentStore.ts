import { create } from 'zustand';
import api from '@/lib/api';
import { type Subject, type Topic, type ContentBlock, type ContentBlockType } from '@/types/domain';

interface ContentState {
  subjects: Subject[];
  topics: Topic[];
  blocks: ContentBlock[];

  currentSubject: Subject | null;
  currentTopic: Topic | null;

  isLoading: boolean;
  error: string | null;

  // Subjects
  fetchSubjects: (spaceId: string) => Promise<void>;
  fetchSubject: (subjectId: string) => Promise<void>;
  createSubject: (spaceId: string, title: string, icon?: string) => Promise<void>;
  updateSubject: (id: string, title: string, icon?: string) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  setCurrentSubject: (subject: Subject | null) => void;

  // Topics
  fetchTopics: (subjectId: string) => Promise<void>;
  createTopic: (subjectId: string, title: string, icon?: string) => Promise<void>;
  updateTopic: (id: string, title: string, icon?: string) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  setCurrentTopic: (topic: Topic | null) => void;

  // Blocks
  hasMore: boolean;
  cursor: string | null;

  fetchBlocks: (topicId: string, options?: { types?: string[], tags?: string[], search?: string }, isLoadMore?: boolean) => Promise<void>;
  addBlock: (topicId: string, type: ContentBlockType, initialData?: Partial<ContentBlock>) => Promise<ContentBlock>;
  updateBlock: (id: string, updates: Partial<ContentBlock>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  setBlocks: (blocks: ContentBlock[]) => void;
  bulkCreateBlocks: (topicId: string, blocks: Partial<ContentBlock>[]) => Promise<void>;



  // Helpers
  getSubjects: (spaceId: string) => Promise<Subject[]>;
  getTopics: (subjectId: string) => Promise<Topic[]>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  subjects: [],
  topics: [],
  blocks: [],
  currentSubject: null,
  currentTopic: null,
  isLoading: false,
  error: null,
  hasMore: true,
  cursor: null,

  // --- Subjects ---
  fetchSubjects: async (spaceId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<Subject[]>(`/spaces/${spaceId}/subjects`);
      set({ subjects: Array.isArray(res.data) ? res.data : [], isLoading: false });
    } catch (error) {
      console.error('Fetch subjects error:', error);
      set({ error: 'Failed to fetch subjects', isLoading: false });
    }
  },

  fetchSubject: async (subjectId) => {
    try {
      const res = await api.get<Subject>(`/subjects/${subjectId}`);
      set({ currentSubject: res.data });
    } catch (error) {
      console.error('Fetch subject error:', error);
    }
  },

  createSubject: async (spaceId, title, icon) => {
    try {
      await api.post('/subjects', { spaceId, title, icon });
      await get().fetchSubjects(spaceId);
    } catch (error) {
      console.error('Create subject error:', error);
      throw error;
    }
  },

  updateSubject: async (id, title, icon) => {
    try {
      await api.put(`/subjects/${id}`, { title, icon });
      set(state => ({
        subjects: state.subjects.map(s => s._id === id ? { ...s, title, icon: icon || s.icon } : s),
        currentSubject: state.currentSubject?._id === id ? { ...state.currentSubject, title } : state.currentSubject
      }));
    } catch (error) {
      console.error('Update subject error:', error);
      throw error;
    }
  },

  deleteSubject: async (id) => {
    try {
      await api.delete(`/subjects/${id}`);
      set(state => ({
        subjects: state.subjects.filter(s => s._id !== id),
        currentSubject: state.currentSubject?._id === id ? null : state.currentSubject
      }));
    } catch (error) {
      console.error('Delete subject error:', error);
      throw error;
    }
  },

  setCurrentSubject: (subject) => set({ currentSubject: subject }),

  // --- Topics ---
  fetchTopics: async (subjectId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<Topic[]>(`/subjects/${subjectId}/topics`);
      set({ topics: Array.isArray(res.data) ? res.data : [], isLoading: false });
    } catch (error) {
      console.error('Fetch topics error:', error);
      set({ error: 'Failed to fetch topics', isLoading: false });
    }
  },

  createTopic: async (subjectId, title, icon) => {
    try {
      await api.post('/topics', { subjectId, title, icon });
      await get().fetchTopics(subjectId);
    } catch (error) {
      console.error('Create topic error:', error);
      throw error;
    }
  },

  updateTopic: async (id, title, icon) => {
    try {
      await api.put(`/topics/${id}`, { title, icon });
      set(state => ({
        topics: state.topics.map(t => t._id === id ? { ...t, title, icon: icon || t.icon } : t),
        currentTopic: state.currentTopic?._id === id ? { ...state.currentTopic, title } : state.currentTopic
      }));
    } catch (error) {
      console.error('Update topic error:', error);
      throw error;
    }
  },

  deleteTopic: async (id) => {
    try {
      await api.delete(`/topics/${id}`);
      set(state => ({
        topics: state.topics.filter(t => t._id !== id),
        currentTopic: state.currentTopic?._id === id ? null : state.currentTopic
      }));
    } catch (error) {
      console.error('Delete topic error:', error);
      throw error;
    }
  },

  setCurrentTopic: (topic) => set({ currentTopic: topic }),

  // --- Blocks ---
  fetchBlocks: async (topicId, options, isLoadMore = false) => {
    if (!isLoadMore) {
      set({ isLoading: true, error: null, blocks: [], cursor: null, hasMore: true });
    } else {
      if (!get().hasMore) return;
      set({ isLoading: true, error: null });
    }

    try {
      const params: Record<string, string> = {};

      const currentCursor = isLoadMore ? get().cursor : null;
      if (currentCursor) {
        params.cursor = currentCursor;
      }

      params.limit = '20';

      if (options?.types && options.types.length > 0) {
        params.types = options.types.join(',');
      }

      if (options?.tags && options.tags.length > 0) {
        params.tags = options.tags.join(',');
      }

      if (options?.search) {
        params.search = options.search;
      }

      console.log('Fetching blocks with params:', params);

      const res = await api.get<{ blocks: ContentBlock[], nextCursor: string | null }>(`/topics/${topicId}/content`, { params });

      set(state => ({
        blocks: isLoadMore
          ? [...state.blocks, ...(Array.isArray(res.data?.blocks) ? res.data.blocks : [])]
          : (Array.isArray(res.data?.blocks) ? res.data.blocks : []),
        isLoading: false,
        cursor: res.data?.nextCursor ?? null,
        hasMore: !!res.data?.nextCursor
      }));
    } catch (error) {
      console.error('Fetch blocks error:', error);
      set({ error: 'Failed to fetch blocks', isLoading: false });
    }
  },

  addBlock: async (topicId, type, initialData) => {
    try {
      const defaultBlock = {
        topicId,
        kind: type,
        content: type === 'note' ? 'New note...' : undefined,
        question: type !== 'note' ? 'New Question' : undefined,
        options: (type === 'single_select_mcq' || type === 'multi_select_mcq') ? [{ id: '1', text: 'Option A', isCorrect: false }] : undefined,
      };

      // Override defaults with initialData if provided
      const payload = { ...defaultBlock, ...initialData };

      const res = await api.post<ContentBlock>('/content', payload);
      const newBlock = res.data;

      // Append to local state
      set(state => ({ blocks: [...state.blocks, newBlock] }));
      return newBlock;
    } catch (error) {
      console.error('Add block error:', error);
      throw error;
    }
  },

  bulkCreateBlocks: async (topicId: string, blocks: Partial<ContentBlock>[]) => {
    try {
      const res = await api.post<ContentBlock[]>('/content/bulk', { topicId, blocks });
      const newBlocks = res.data;

      // Append to local state
      set(state => ({ blocks: [...state.blocks, ...newBlocks] }));
    } catch (error) {
      console.error('Bulk create error:', error);
      throw error;
    }
  },

  updateBlock: async (id, updates) => {
    // Optimistic
    const previousBlocks = get().blocks;
    set({ blocks: previousBlocks.map(b => b._id === id ? { ...b, ...updates } as ContentBlock : b) });

    try {
      await api.put(`/content/${id}`, updates);
    } catch (error) {
      console.error('Update block error:', error);
      set({ blocks: previousBlocks }); // Revert
      throw error; // Let UI handle notification if needed
    }
  },

  deleteBlock: async (id) => {
    const previousBlocks = get().blocks;
    set({ blocks: previousBlocks.filter(b => b._id !== id) });

    try {
      await api.delete(`/content/${id}`);
    } catch (error) {
      console.error('Delete block error:', error);
      set({ blocks: previousBlocks });
      throw error;
    }
  },

  setBlocks: (blocks) => set({ blocks }),



  // Helpers for wizards/external use without modifying store state
  getSubjects: async (spaceIdStrOrSlug: string) => {
    try {
      const res = await api.get<Subject[]>(`/spaces/${spaceIdStrOrSlug}/subjects`);
      return res.data;
    } catch (error) {
      console.error('getSubjects error', error);
      throw error;
    }
  },

  getTopics: async (subjectIdStrOrSlug: string) => {
    try {
      const res = await api.get<Topic[]>(`/subjects/${subjectIdStrOrSlug}/topics`);
      return res.data;
    } catch (error) {
      console.error('getTopics error', error);
      throw error;
    }
  },
}));
