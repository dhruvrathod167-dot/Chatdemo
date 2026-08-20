import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/types/nova';
import { Copy, Check, Bot, User, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const { sender, content, citations } = message;
  const isAssistant = sender === 'assistant';
  
  const [copied, setCopied] = useState(false);
  const [activeCitationIndex, setActiveCitationIndex] = useState<number | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const toggleCitation = (idx: number) => {
    if (activeCitationIndex === idx) {
      setActiveCitationIndex(null);
    } else {
      setActiveCitationIndex(idx);
    }
  };

  return (
    <div className={`flex w-full py-6 px-4 md:px-6 gap-4 border-b border-gray-150/40 dark:border-gray-800/30 ${
      isAssistant ? 'bg-gray-50/30 dark:bg-sidebarbg-dark/10' : 'bg-transparent'
    }`}>
      
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${
        isAssistant 
          ? 'bg-nova-accent/15 text-nova-accent border border-nova-accent/25' 
          : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300/20'
      }`}>
        {isAssistant ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
      </div>

      {/* Message Body Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Author header */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {isAssistant ? 'NOVA AI' : 'You'}
          </span>
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Text Markdown Render */}
        <div className={`prose dark:prose-invert max-w-none text-sm leading-relaxed text-gray-800 dark:text-gray-200 break-words ${
          isAssistant && content === 'Thinking...' ? 'streaming-cursor italic text-gray-500' : ''
        }`}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* Citations references */}
        {isAssistant && citations && citations.length > 0 && (
          <div className="mt-4 border-t border-gray-200/40 dark:border-gray-800/40 pt-3 flex flex-col gap-2">
            <span className="text-xxs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Sources used in response
            </span>
            <div className="flex flex-col gap-1.5">
              {citations.map((cite, idx) => {
                const isOpen = activeCitationIndex === idx;
                return (
                  <div 
                    key={idx} 
                    className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/30 overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCitation(idx)}
                      className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition"
                    >
                      <span className="truncate">{cite.filename}</span>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 text-xxs leading-relaxed font-mono text-gray-500 dark:text-gray-400 whitespace-pre-wrap border-t border-gray-150/40 dark:border-gray-800/30">
                        {cite.snippet}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
