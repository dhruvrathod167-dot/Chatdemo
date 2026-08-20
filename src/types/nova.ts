export interface User {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  provider: 'ollama' | 'openai';
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string | null;
  email: string;
  user_id: number;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  filename: string;
  snippet: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: 'user' | 'assistant';
  content: string;
  created_at: string;
  user_edited: boolean;
  citations: Citation[];
}
