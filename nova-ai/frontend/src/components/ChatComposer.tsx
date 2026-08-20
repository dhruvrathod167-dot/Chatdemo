import React, { useRef, useState, useEffect } from 'react';
import { useChatStore } from '../stores/chat';
import { Paperclip, X, AlertCircle, Sparkles, StopCircle, ArrowUp } from 'lucide-react';

export const ChatComposer: React.FC = () => {
  const { 
    sendMessage, stopGeneration, isGenerating, isUploading, 
    uploadedFiles, uploadFile, removeUploadedFile, settings, updateSettings, models 
  } = useChatStore();

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) {
      stopGeneration();
      return;
    }
    
    if (!input.trim() && uploadedFiles.length === 0) return;
    
    const messageContent = input.trim();
    setInput('');
    setError(null);
    
    try {
      await sendMessage(messageContent);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setError(null);
    const file = files[0];
    const success = await uploadFile(file);
    if (!success) {
      setError(`Failed to upload ${file.name}. Size limit: 15MB. Formats: PDF, DOCX, TXT, MD`);
    }
    
    // Clear input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (settings) {
      await updateSettings({ model: e.target.value });
    }
  };

  return (
    <div className="w-full flex flex-col gap-2 p-4 bg-chatbg-light dark:bg-chatbg-dark border-t border-gray-150 dark:border-gray-800">
      
      {/* Attachment previews */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {uploadedFiles.map((file) => (
            <div 
              key={file.id} 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-panelbg-dark text-xs border border-gray-200 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-2 duration-100"
            >
              <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                {file.filename}
              </span>
              <button
                type="button"
                onClick={() => removeUploadedFile(file.id)}
                className="p-0.5 text-gray-400 hover:text-red-500 rounded-md transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inline alerts */}
      {error && (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 text-xs border border-red-200 dark:border-red-900/30">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Composer Box */}
      <form onSubmit={handleSend} className="relative flex flex-col w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 focus-within:ring-2 focus-within:ring-accent/35 focus-within:border-accent transition-all duration-150">
        
        {/* Text Field */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask NOVA AI anything..."
          rows={1}
          className="w-full pl-4 pr-16 pt-3.5 pb-12 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none resize-none min-h-[44px]"
        />

        {/* Controls Toolbar */}
        <div className="absolute left-3 bottom-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* File upload trigger */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.markdown"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition ${isUploading ? 'opacity-50' : ''}`}
              title="Attach Document (PDF, TXT, DOCX, MD)"
            >
              <Paperclip className={`w-4 h-4 ${isUploading ? 'animate-pulse' : ''}`} />
            </button>

            {/* Model Select dropdown */}
            {settings && models.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-chatbg-dark border border-gray-200 dark:border-gray-800 text-xxs font-semibold text-gray-500 dark:text-gray-400">
                <Sparkles className="w-3 h-3 text-accent" />
                <select
                  value={settings.model}
                  onChange={handleModelChange}
                  className="bg-transparent focus:outline-none cursor-pointer font-sans"
                >
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pointer-events-auto">
            {isGenerating ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/10 active:scale-95 transition"
                title="Stop generation"
              >
                <StopCircle className="w-4.5 h-4.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && uploadedFiles.length === 0}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent hover:bg-accent-hover text-white shadow-md shadow-indigo-500/10 active:scale-95 disabled:opacity-40 disabled:hover:bg-accent disabled:active:scale-100 transition duration-150"
              >
                <ArrowUp className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </div>

      </form>
      
      {/* Help hint */}
      <div className="text-center text-xxs text-gray-400 dark:text-gray-500 px-4">
        NOVA AI can make mistakes. Verify important information.
      </div>
      
    </div>
  );
};
