import { create } from 'zustand';
import { User } from '@/types/nova';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  initialize: () => Promise<void>;
  clearError: () => void;
}

const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('nova_auth_token') : null,
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  initialize: async () => {
    const { token } = get();
    if (!token) {
      set({ isInitialized: true, isAuthenticated: false });
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const user = await response.json();
        set({ user, isAuthenticated: true, isInitialized: true, error: null });
      } else {
        // Token invalid/expired
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nova_auth_token');
        }
        set({ token: null, user: null, isAuthenticated: false, isInitialized: true });
      }
    } catch (err) {
      // Offline or backend unavailable, keep local state but mark initialized
      set({ isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (!response.ok) {
        set({ error: data.detail || 'Login failed' });
        return false;
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('nova_auth_token', data.access_token);
      }
      set({ token: data.access_token, isAuthenticated: true });
      await get().initialize();
      return true;
    } catch (err) {
      set({ error: 'Server connection failed' });
      return false;
    }
  },

  register: async (email, password) => {
    set({ error: null });
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (!response.ok) {
        set({ error: data.detail || 'Registration failed' });
        return false;
      }
      return true;
    } catch (err) {
      set({ error: 'Server connection failed' });
      return false;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nova_auth_token');
    }
    set({ token: null, user: null, isAuthenticated: false, error: null });
  }
}));
