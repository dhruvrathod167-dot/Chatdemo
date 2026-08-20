import React, { useEffect, useState } from 'react';
import { useChatStore } from '@/stores/nova-chat';
import { X, Moon, Sun, Settings, Bot, Sliders } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { models, fetchSettings, updateSettings, fetchModels } = useChatStore();
  const [activeTab, setActiveTab] = useState<'general' | 'model' | 'system'>('general');
  
  // Local state for editing fields
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [provider, setProvider] = useState<'ollama' | 'openai'>('ollama');
  const [model, setModel] = useState('llama3');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSettings().then(() => {
        const s = useChatStore.getState().settings;
        if (s) {
          setTheme(s.theme);
          setProvider(s.provider);
          setModel(s.model);
          setTemperature(s.temperature);
          setMaxTokens(s.max_tokens);
          setSystemPrompt(s.system_prompt || '');
        }
      });
      fetchModels();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await updateSettings({
      theme,
      provider,
      model,
      temperature,
      max_tokens: maxTokens,
      system_prompt: systemPrompt
    });
    
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-2xl h-[550px] bg-sidebarbg-light dark:bg-sidebarbg-dark border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-chatbg-light dark:bg-chatbg-dark">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-nova-accent" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Content Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-2 bg-gray-50/50 dark:bg-gray-900/35">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'general'
                  ? 'bg-nova-accent text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-800/60'
              }`}
            >
              <Sun className="w-4 h-4" />
              General
            </button>
            <button
              onClick={() => setActiveTab('model')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'model'
                  ? 'bg-nova-accent text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-800/60'
              }`}
            >
              <Bot className="w-4 h-4" />
              Model Options
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'system'
                  ? 'bg-nova-accent text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              System Prompt
            </button>
          </div>

          {/* Form Content Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-chatbg-light dark:bg-chatbg-dark">
            {activeTab === 'general' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Display Theme</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition ${
                        theme === 'light'
                          ? 'border-nova-accent bg-nova-accent/10 text-nova-accent font-semibold'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      <Sun className="w-4 h-4" /> Light
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition ${
                        theme === 'dark'
                          ? 'border-nova-accent bg-nova-accent/10 text-nova-accent font-semibold'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      <Moon className="w-4 h-4" /> Dark
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">AI Provider</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setProvider('ollama')}
                      className={`p-3 rounded-xl border text-sm font-medium text-center transition ${
                        provider === 'ollama'
                          ? 'border-nova-accent bg-nova-accent/10 text-nova-accent font-semibold'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      Ollama (Local)
                    </button>
                    <button
                      onClick={() => setProvider('openai')}
                      className={`p-3 rounded-xl border text-sm font-medium text-center transition ${
                        provider === 'openai'
                          ? 'border-nova-accent bg-nova-accent/10 text-nova-accent font-semibold'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      OpenAI Compatible
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {provider === 'ollama' 
                      ? "Requires Ollama to be running on localhost:11434 with models pre-downloaded." 
                      : "Uses OpenAI API configurations defined in backend environment."}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'model' && (
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Active LLM Model</label>
                  {models && models.length > 0 ? (
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nova-accent transition"
                    >
                      {models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. llama3, mistral, gpt-4o"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nova-accent transition"
                    />
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold mb-1">
                    <label className="text-gray-900 dark:text-white">Temperature: {temperature}</label>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-nova-accent"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Precise / Logical (0.0)</span>
                    <span>Creative / Random (1.5)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold mb-1">
                    <label className="text-gray-900 dark:text-white">Max Output Tokens: {maxTokens}</label>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="256"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-nova-accent"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Short (256)</span>
                    <span>Long (8192)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="flex flex-col h-full gap-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">System Prompt Guidelines</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Instruct the AI helper how to behave..."
                  className="flex-1 w-full p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-nova-accent resize-none min-h-[220px] transition"
                />
                <p className="text-xs text-gray-500">
                  Wiping this field clean will load the standard default NOVA AI general helper system prompt on the backend.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-nova-accent hover:bg-nova-accent-hover rounded-xl shadow-md transition"
          >
            Save changes
          </button>
        </div>

      </div>
    </div>
  );
};
