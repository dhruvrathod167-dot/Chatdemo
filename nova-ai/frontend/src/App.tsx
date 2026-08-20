import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from './stores/auth';
import { useChatStore } from './stores/chat';
import { Sidebar } from './components/Sidebar';
import { ChatComposer } from './components/ChatComposer';
import { MessageItem } from './components/MessageItem';
import { SettingsModal } from './components/SettingsModal';
import { 
  Sparkles, Lock, Mail, Menu, ArrowRight, 
  HelpCircle, Code, FileText, Compass, AlertCircle
} from 'lucide-react';

export const App: React.FC = () => {
  const { isInitialized, isAuthenticated, initialize, login, register, error: authError, clearError } = useAuthStore();
  const { 
    messages, selectConversation, fetchConversations, fetchSettings, 
    fetchModels, currentConversationId, conversations, sendMessage
  } = useChatStore();

  // Auth screen forms state
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Layout modals/menus
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Auth & global configurations on load
  useEffect(() => {
    initialize();
  }, []);

  // Fetch initial chat states on login
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
      fetchSettings();
      fetchModels();
    }
  }, [isAuthenticated]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthLoading(true);
    clearError();

    if (authTab === 'login') {
      const success = await login(email, password);
      if (success) {
        setEmail('');
        setPassword('');
      }
    } else {
      const success = await register(email, password);
      if (success) {
        alert('Registration successful! Please sign in.');
        setAuthTab('login');
        setPassword('');
      }
    }
    setAuthLoading(false);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  // 1. Loading screen
  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-chatbg-light dark:bg-chatbg-dark text-gray-900 dark:text-white">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent text-white shadow-xl shadow-indigo-500/20 animate-bounce">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="mt-4 font-bold text-sm tracking-wide animate-pulse">Initializing NOVA AI...</h2>
      </div>
    );
  }

  // 2. Auth view
  if (!isAuthenticated) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-chatbg-light dark:bg-chatbg-dark px-4 overflow-hidden">
        {/* Soft glowing ambient spots */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />

        <div className="w-full max-w-md p-8 bg-white dark:bg-sidebarbg-dark/45 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl backdrop-blur-md z-10 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent text-white shadow-xl shadow-indigo-500/20 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NOVA AI</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ChatGPT-style production chat workspace</p>
          </div>

          {/* Form Tabs */}
          <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-6">
            <button
              onClick={() => { setAuthTab('login'); clearError(); }}
              className={`py-2 text-xs font-semibold rounded-lg transition ${authTab === 'login' ? 'bg-white dark:bg-panelbg-dark text-gray-900 dark:text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthTab('register'); clearError(); }}
              className={`py-2 text-xs font-semibold rounded-lg transition ${authTab === 'register' ? 'bg-white dark:bg-panelbg-dark text-gray-900 dark:text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-accent/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-accent/40"
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 text-xs border border-red-200 dark:border-red-900/30">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="flex items-center justify-center gap-2 w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition active:scale-98"
            >
              {authLoading ? 'Processing...' : authTab === 'login' ? 'Sign In' : 'Sign Up'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Authenticated dashboard view
  const currentChatTitle = conversations.find(c => c.id === currentConversationId)?.title || 'New Chat';

  return (
    <div className="flex h-screen bg-chatbg-light dark:bg-chatbg-dark overflow-hidden font-sans">
      
      {/* Sidebar navigation */}
      <Sidebar 
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main chat window */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-chatbg-light dark:bg-chatbg-dark">
        
        {/* Header bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-chatbg-light dark:bg-chatbg-dark border-b border-gray-150 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 md:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-xl transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[200px] md:max-w-md">
                {currentChatTitle}
              </span>
              <span className="text-xxs text-gray-400 dark:text-gray-500">
                NOVA AI workspace
              </span>
            </div>
          </div>
          
          <button
            onClick={() => selectConversation(null)}
            className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition"
          >
            Reset view
          </button>
        </header>

        {/* Message Panel / Welcome View */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 text-center max-w-2xl mx-auto">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/15 text-accent border border-accent/20 mb-6 shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome to NOVA AI</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
                How can I assist you today? Start asking questions, write programming scripts, or upload documents to query their content.
              </p>

              {/* Suggestions grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
                <button
                  onClick={() => handleSuggestedPrompt("Explain quantum computing in extremely simple terms")}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-gray-150 dark:border-gray-800/80 hover:border-accent/40 bg-white/40 dark:bg-sidebarbg-dark/15 hover:bg-accent/5 text-left text-xs font-medium text-gray-700 dark:text-gray-300 transition"
                >
                  <Compass className="w-4 h-4 text-accent" />
                  <span>Explain quantum computing in simple terms</span>
                </button>
                <button
                  onClick={() => handleSuggestedPrompt("Write a clean python script to parse a nested JSON block")}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-gray-150 dark:border-gray-800/80 hover:border-accent/40 bg-white/40 dark:bg-sidebarbg-dark/15 hover:bg-accent/5 text-left text-xs font-medium text-gray-700 dark:text-gray-300 transition"
                >
                  <Code className="w-4 h-4 text-accent" />
                  <span>Write a python script to parse JSON</span>
                </button>
                <button
                  onClick={() => handleSuggestedPrompt("Summarize key strategies for scaling a fastAPI backend")}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-gray-150 dark:border-gray-800/80 hover:border-accent/40 bg-white/40 dark:bg-sidebarbg-dark/15 hover:bg-accent/5 text-left text-xs font-medium text-gray-700 dark:text-gray-300 transition"
                >
                  <FileText className="w-4 h-4 text-accent" />
                  <span>Summarize methods to scale FastAPI</span>
                </button>
                <button
                  onClick={() => handleSuggestedPrompt("What are the best practices to avoid useEffect memory leaks?")}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-gray-150 dark:border-gray-800/80 hover:border-accent/40 bg-white/40 dark:bg-sidebarbg-dark/15 hover:bg-accent/5 text-left text-xs font-medium text-gray-700 dark:text-gray-300 transition"
                >
                  <HelpCircle className="w-4 h-4 text-accent" />
                  <span>React useEffect hooks best practices</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <ChatComposer />

      </div>

      {/* Settings Dialog Overlay */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

    </div>
  );
};
