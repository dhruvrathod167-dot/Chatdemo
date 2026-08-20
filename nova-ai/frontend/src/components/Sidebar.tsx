import React, { useState } from 'react';
import { useChatStore } from '../stores/chat';
import { useAuthStore } from '../stores/auth';
import { 
  MessageSquare, Plus, Search, Trash2, Edit3, Check, X, 
  Settings, LogOut, Moon, Sun, Sparkles 
} from 'lucide-react';

interface SidebarProps {
  onOpenSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, isOpenMobile, onCloseMobile }) => {
  const { 
    conversations, currentConversationId, selectConversation, 
    createConversation, renameConversation, deleteConversation,
    searchQuery, setSearchQuery, settings, updateSettings 
  } = useChatStore();
  const { user, logout } = useAuthStore();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleNewChat = async () => {
    await createConversation();
    if (isOpenMobile) onCloseMobile();
  };

  const handleStartRename = (id: number, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await deleteConversation(id);
    }
  };

  const toggleTheme = async () => {
    if (!settings) return;
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    await updateSettings({ theme: nextTheme });
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebarbg-light dark:bg-sidebarbg-dark border-r border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200">
      
      {/* Brand logo header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <span className="font-bold text-base tracking-wide text-gray-900 dark:text-white">NOVA AI</span>
        </div>
      </div>

      {/* Primary actions */}
      <div className="p-4 flex flex-col gap-3">
        <button
          onClick={handleNewChat}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-chatbg-light dark:bg-chatbg-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1.5 focus:ring-accent/40 focus:border-accent transition"
          />
        </div>
      </div>

      {/* History scroll list */}
      <div className="flex-1 overflow-y-auto px-3 py-1 flex flex-col gap-1">
        <span className="px-2 py-1.5 text-xxs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Recent Chats
        </span>
        {filteredConversations.length === 0 ? (
          <div className="px-3 py-4 text-xs text-center text-gray-400 dark:text-gray-500">
            No chats found
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = currentConversationId === conv.id;
            const isEditing = editingId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => {
                  selectConversation(conv.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm cursor-pointer border border-transparent transition active:scale-[0.99] duration-100 ${
                  isActive
                    ? 'bg-panelbg-light dark:bg-panelbg-dark text-gray-900 dark:text-white font-medium border-gray-200 dark:border-gray-800'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-accent' : 'text-gray-400'}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-white dark:bg-chatbg-dark px-1.5 py-0.5 rounded text-xs border border-accent focus:outline-none"
                    />
                  ) : (
                    <span className="truncate text-xs">{conv.title}</span>
                  )}
                </div>

                {/* Hover actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={(e) => handleSaveRename(conv.id, e)}
                        className="p-0.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleCancelRename}
                        className="p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleStartRename(conv.id, conv.title, e)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer User Profile & Settings */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/10 flex flex-col gap-2">
        
        {/* Toggle dark/light theme & settings row */}
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-gray-150 dark:hover:bg-gray-800 transition active:scale-95"
            title="Toggle theme"
          >
            {settings?.theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl hover:bg-gray-150 dark:hover:bg-gray-800 transition active:scale-95"
            title="Open configuration"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-gray-100 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50 mt-1">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-xs font-semibold truncate text-gray-800 dark:text-gray-200">
              {user?.email.split('@')[0]}
            </p>
            <p className="text-xxs text-gray-400 dark:text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-lg transition"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block w-72 h-full flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile view backdrop */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-xxs flex">
          <div className="w-72 h-full animate-in slide-in-from-left duration-150">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
