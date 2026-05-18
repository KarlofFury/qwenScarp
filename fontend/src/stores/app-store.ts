import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
}

export interface ScrapeResult {
  id: string;
  response: string;
  duration: number;
  model: string;
  conversationId: string;
  timestamp: string;
}

interface AppState {
  messages: Message[];
  scrapes: ScrapeResult[];
  scraping: boolean;
  scrapeElapsed: number;
  viewMode: 'chat-empty' | 'chat-active';
  
  // Actions
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  addScrape: (result: ScrapeResult) => void;
  setScraping: (status: boolean) => void;
  setScrapeElapsed: (seconds: number) => void;
  setViewMode: (mode: 'chat-empty' | 'chat-active') => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  messages: [],
  scrapes: [],
  scraping: false,
  scrapeElapsed: 0,
  viewMode: 'chat-empty',
  
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m))
  })),
  addScrape: (result) => set((state) => ({ scrapes: [...state.scrapes, result] })),
  setScraping: (status) => set({ scraping: status }),
  setScrapeElapsed: (seconds) => set({ scrapeElapsed: seconds }),
  setViewMode: (mode) => set({ viewMode: mode }),
  clearMessages: () => set({ messages: [] }),
}));
