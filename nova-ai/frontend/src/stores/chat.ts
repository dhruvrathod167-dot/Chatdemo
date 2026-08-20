import { create } from 'zustand';
import { Conversation, Message, UserSettings } from '../types';
import { useAuthStore } from './auth';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: number | null;
  messages: Message[];
  models: string[];
  settings: UserSettings | null;
  isGenerating: boolean;
  isUploading: boolean;
  searchQuery: string;
  uploadedFiles: { id: number; filename: string }[];
  abortController: AbortController | null;
  
  setSearchQuery: (query: string) => void;
  fetchConversations: () => Promise<void>;
  selectConversation: (id: number | null) => Promise<void>;
  createConversation: (title?: string) => Promise<number | null>;
  renameConversation: (id: number, title: string) => Promise<void>;
  deleteConversation: (id: number) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  uploadFile: (file: File) => Promise<boolean>;
  removeUploadedFile: (id: number) => void;
  fetchSettings: () => Promise<void>;
  updateSettings: (settingsPatch: Partial<UserSettings>) => Promise<void>;
  fetchModels: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  models: [],
  settings: null,
  isGenerating: false,
  isUploading: false,
  searchQuery: '',
  uploadedFiles: [],
  abortController: null,

  setSearchQuery: (query) => set({ searchQuery: query }),

  fetchConversations: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const response = await fetch('/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const conversations = await response.json();
        set({ conversations });
      }
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  },

  selectConversation: async (id) => {
    set({ currentConversationId: id, messages: [], uploadedFiles: [] });
    if (id === null) return;
    
    const token = useAuthStore.getState().token;
    if (!token) return;
    
    try {
      const response = await fetch(`/api/conversations/${id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const messages = await response.json();
        set({ messages });
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  },

  createConversation: async (title) => {
    const token = useAuthStore.getState().token;
    if (!token) return null;
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: title || 'New Chat' })
      });
      if (response.ok) {
        const newConv = await response.json();
        set((state) => ({
          conversations: [newConv, ...state.conversations],
          currentConversationId: newConv.id,
          messages: [],
          uploadedFiles: []
        }));
        return newConv.id;
      }
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
    return null;
  },

  renameConversation: async (id, title) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title })
      });
      if (response.ok) {
        const updated = await response.json();
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === id ? updated : c))
        }));
      }
    } catch (err) {
      console.error('Failed to rename conversation', err);
    }
  },

  deleteConversation: async (id) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          const nextActive = state.currentConversationId === id 
            ? (filtered.length > 0 ? filtered[0].id : null)
            : state.currentConversationId;
          
          return {
            conversations: filtered,
            currentConversationId: nextActive
          };
        });
        
        const nextId = get().currentConversationId;
        if (nextId) {
          get().selectConversation(nextId);
        } else {
          set({ messages: [] });
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  },

  sendMessage: async (content) => {
    let convId = get().currentConversationId;
    const token = useAuthStore.getState().token;
    if (!token) return;

    // Create a new conversation if none is active
    if (!convId) {
      // Use the first few words of content as title
      const title = content.length > 30 ? content.substring(0, 27) + '...' : content;
      convId = await get().createConversation(title);
      if (!convId) return;
    }

    // Abort existing generation
    if (get().isGenerating) {
      get().stopGeneration();
    }

    const controller = new AbortController();
    set({ isGenerating: true, abortController: controller });

    // Append client-side user message immediately to the UI
    const clientUserMessage: Message = {
      id: Date.now(), // Temporary key
      conversation_id: convId,
      sender: 'user',
      content: content,
      created_at: new Date().toISOString(),
      user_edited: false,
      citations: []
    };
    set((state) => ({ messages: [...state.messages, clientUserMessage] }));

    // Append helper streaming container placeholder for assistant response
    const clientAssistantMessage: Message = {
      id: Date.now() + 1, // Temporary key
      conversation_id: convId,
      sender: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      user_edited: false,
      citations: []
    };
    set((state) => ({ messages: [...state.messages, clientAssistantMessage] }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ conversation_id: convId, content }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete block in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;
          
          try {
            const parsed = JSON.parse(cleanLine.substring(6));
            if (parsed.status === 'thinking') {
              set((state) => ({
                messages: state.messages.map((m) => 
                  m.id === clientAssistantMessage.id ? { ...m, content: 'Thinking...' } : m
                )
              }));
            } else if (parsed.chunk) {
              set((state) => ({
                messages: state.messages.map((m) => {
                  if (m.id === clientAssistantMessage.id) {
                    const currentText = m.content === 'Thinking...' ? '' : m.content;
                    return { ...m, content: currentText + parsed.chunk };
                  }
                  return m;
                })
              }));
            } else if (parsed.status === 'done') {
              // Finalize message details with DB returned items (id, citations)
              set((state) => ({
                messages: state.messages.map((m) => 
                  m.id === clientAssistantMessage.id ? { 
                    ...m, 
                    id: parsed.message_id, 
                    citations: parsed.citations || [],
                    content: parsed.content || m.content
                  } : m
                )
              }));
              // Refresh conversations to update order/title
              get().fetchConversations();
            } else if (parsed.status === 'error') {
              throw new Error(parsed.error || 'Streaming error');
            }
          } catch (e) {
            console.error('Failed to parse SSE JSON line:', cleanLine, e);
          }
        }
      }
      
      // Clear uploaded files on successful send
      set({ uploadedFiles: [] });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted');
      } else {
        console.error('Streaming failed:', err);
        set((state) => ({
          messages: state.messages.map((m) => 
            m.id === clientAssistantMessage.id ? { 
              ...m, 
              content: m.content + `\n\n*(Error: ${err.message || 'Connection lost'})*` 
            } : m
          )
        }));
      }
    } finally {
      set({ isGenerating: false, abortController: null });
    }
  },

  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ isGenerating: false, abortController: null });
    }
  },

  uploadFile: async (file) => {
    const token = useAuthStore.getState().token;
    if (!token) return false;
    
    set({ isUploading: true });
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const uploaded = await response.json();
        set((state) => ({
          uploadedFiles: [...state.uploadedFiles, { id: uploaded.id, filename: uploaded.filename }]
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('File upload failed', err);
      return false;
    } finally {
      set({ isUploading: false });
    }
  },

  removeUploadedFile: (id) => {
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((f) => f.id !== id)
    }));
  },

  fetchSettings: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const settings = await response.json();
        set({ settings });
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  },

  updateSettings: async (settingsPatch) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settingsPatch)
      });
      if (response.ok) {
        const settings = await response.json();
        set({ settings });
      }
    } catch (err) {
      console.error('Failed to update settings', err);
    }
  },

  fetchModels: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    try {
      const response = await fetch('/api/settings/models', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const models = await response.json();
        set({ models });
      }
    } catch (err) {
      console.error('Failed to fetch models', err);
    }
  }
}));
