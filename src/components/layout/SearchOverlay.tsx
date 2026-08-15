'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/ui-store';
import {
  Search,
  X,
  TrendingUp,
  ArrowRight,
  Clock,
  Mic,
  MicOff,
  Sparkles,
  Shirt,
  Gem,
  Briefcase,
  Watch,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
type SearchResult = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  category: string | null;
  brand: string | null;
};

/* ------------------------------------------------------------------ */
const TRENDING = [
  'Silk Evening Gown',
  'Leather Tote Bag',
  'Cashmere Overcoat',
  'Gold Pendant Necklace',
  'Designer Stilettos',
  'Diamond Stud Earrings',
  'Tailored Wool Blazer',
  'Quilted Chain Bag',
];

const CATEGORIES = [
  { name: 'Women', icon: Shirt, href: '/category/women' },
  { name: 'Men', icon: Shirt, href: '/category/men' },
  { name: 'Bags', icon: Briefcase, href: '/category/bags' },
  { name: 'Jewelry', icon: Gem, href: '/category/jewelry' },
  { name: 'Shoes', icon: Watch, href: '/category/shoes' },
  { name: 'Accessories', icon: Watch, href: '/category/accessories' },
];

const AI_SUGGESTIONS = [
  'What to wear to a black-tie event?',
  'Best investment bags 2026',
  'Minimalist everyday jewelry',
  'Seasonal color palette guide',
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
};
const searchBarVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 },
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.25 } },
};

const resultsVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 },
  },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.04 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ------------------------------------------------------------------ */
const STORAGE_KEY = 'maison-search-history';
function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').slice(0, 6);
  } catch {
    return [];
  }
}

function addToSearchHistory(term: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = existing.filter((t) => t.toLowerCase() !== term.toLowerCase());
    localStorage.setItem(STORAGE_KEY, JSON.stringify([term, ...filtered].slice(0, 8)));
  } catch {
    /* noop */
  }
}

function clearSearchHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/* ------------------------------------------------------------------ */
export default function SearchOverlay() {
  const searchOpen = useUIStore((s) => s.searchOpen);
  const closeSearch = useUIStore((s) => s.closeSearch);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVoiceSupported(
      typeof window !== 'undefined' &&
        !!(window as unknown as Record<string, unknown>).SpeechRecognition,
    );
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setSearchHistory(getSearchHistory());
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      setVoiceActive(false);
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchOpen) closeSearch();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [searchOpen, closeSearch]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setHasSearched(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      addToSearchHistory(q);
      setSearchHistory(getSearchHistory());
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch],
  );

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleTrendingClick = (term: string) => { handleInputChange(term); };
  const handleHistoryClick = (term: string) => { handleInputChange(term); };
  const handleHistoryClear = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  const toggleVoice = useCallback(() => {
    if (voiceActive) { setVoiceActive(false); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) return;
      const recognition = new SpeechRecognitionCtor();
      recognition.onresult = (e: { results: { 0: { 0: { transcript: string } } } }) => {
        handleInputChange(e.results[0][0].transcript);
        setVoiceActive(false);
      };
      recognition.onend = () => setVoiceActive(false);
      recognition.start();
      setVoiceActive(true);
    } catch {
      /* voice not available */
    }
  }, [voiceActive, handleInputChange]);

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          key="search-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[80] bg-black/97 backdrop-blur-2xl"
          onClick={(e) => { if (e.target === e.currentTarget) closeSearch(); }}
        >
          <div className="mx-auto flex h-full max-w-5xl flex-col px-6 pt-28 md:pt-36">
            {/* Search bar */}
            <motion.div variants={searchBarVariants} initial="hidden" animate="visible" exit="exit">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Search collections, designers, pieces..."
                  className="w-full border-b-2 border-white/20 bg-transparent py-5 pl-14 pr-24 font-['Playfair_Display'] text-2xl md:text-3xl text-white placeholder:text-white/25 outline-none transition-colors duration-300 focus:border-[#C9A96E]/60"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {voiceSupported && (
                    <button
                      onClick={toggleVoice}
                      className={
                        voiceActive
                          ? 'p-2 rounded-full transition-all duration-300 bg-red-500/20 text-red-400'
                          : 'p-2 rounded-full transition-all duration-300 text-white/30 hover:text-[#C9A96E]'
                      }
                      aria-label={voiceActive ? 'Stop voice search' : 'Start voice search'}
                    >
                      {voiceActive ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                  )}
                  <button
                    onClick={closeSearch}
                    className="p-2 text-white/40 hover:text-white transition-colors"
                    aria-label="Close search"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              {/* Voice active indicator */}
              <AnimatePresence>
                {voiceActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 pt-4 overflow-hidden"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 rounded-full bg-[#C9A96E]"
                          animate={{ height: [8, 24, 12, 20, 8], opacity: [1, 0.3, 1], transition: { repeat: Infinity, duration: 0.8, delay: i * 0.1, ease: 'easeInOut' } }}
                        />
                      ))}
                    </div>
                    <span className="font-['Inter'] text-sm text-white/50">Listening...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Results / Suggestions / Trending */}
            <motion.div variants={resultsVariants} initial="hidden" animate="visible" exit="exit" className="flex-1 overflow-y-auto pb-12 pt-10">
              {/* Loading */}
              {loading && (
                <div className="flex items-center gap-3 text-white/40 font-['Inter'] text-sm">
                  <motion.div className="h-1.5 w-1.5 rounded-full bg-[#C9A96E]" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                  <motion.div className="h-1.5 w-1.5 rounded-full bg-[#C9A96E]" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} />
                  <motion.div className="h-1.5 w-1.5 rounded-full bg-[#C9A96E]" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.3 }} />
                  <span className="ml-2">Searching...</span>
                </div>
              )}

              {/* Results grid */}
              {!loading && results.length > 0 && (
                <div>
                  <p className="mb-6 font-['Inter'] text-xs uppercase tracking-[0.2em] text-white/40">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {results.map((item, i) => (
                      <motion.a
                        key={item.id}
                        href={`/product/${item.slug}`}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={closeSearch}
                        className="group flex gap-4 rounded-lg bg-white/[0.03] p-3 text-left transition-all duration-300 hover:bg-white/[0.07] border border-transparent hover:border-white/10"
                      >
                        <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded bg-white/5">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Search className="h-4 w-4 text-white/20" />
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center">
                          <p className="font-['Inter'] text-sm font-medium text-white/90 truncate">{item.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            {item.brand && <span className="font-['Inter'] text-xs text-[#C9A96E] uppercase tracking-wider truncate">{item.brand}</span>}
                            {item.category && <span className="font-['Inter'] text-xs text-white/30 truncate">{item.category}</span>}
                          </div>
                          <p className="mt-1 font-['Inter'] text-sm font-medium text-white/70">
                            {'\$'}{item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <ArrowRight className="mt-auto h-4 w-4 flex-shrink-0 self-end text-white/20 transition-colors group-hover:text-[#C9A96E]" />
                      </motion.a>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {!loading && hasSearched && results.length === 0 && query.length >= 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                  <p className="font-['Playfair_Display'] text-xl text-white/60">No results found</p>
                  <p className="mt-2 font-['Inter'] text-sm text-white/30">Try a different search term or browse our collections</p>
                </motion.div>
              )}

              {/* Default state: History + Trending + Categories */}
              {!loading && !hasSearched && query.length < 2 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                  {/* Search History */}
                  {searchHistory.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-white/40" />
                          <span className="font-['Inter'] text-xs uppercase tracking-[0.2em] text-white/40">Recent</span>
                        </div>
                        <button onClick={handleHistoryClear} className="font-['Inter'] text-[10px] uppercase tracking-wider text-white/25 hover:text-white/60 transition-colors">Clear</button>
                      </div>
                      <div className="space-y-1">
                        {searchHistory.map((term, i) => (
                          <motion.button
                            key={term}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.03 * i, duration: 0.3 }}
                            onClick={() => handleHistoryClick(term)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 hover:bg-white/[0.05] group"
                          >
                            <Clock className="h-3.5 w-3.5 text-white/20 flex-shrink-0" />
                            <span className="font-['Inter'] text-sm text-white/50 group-hover:text-white/90 transition-colors truncate">{term}</span>
                            <ArrowRight className="h-3 w-3 flex-shrink-0 ml-auto text-white/10 group-hover:text-[#C9A96E] transition-colors" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending + AI Suggestions + Categories */}
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-[#C9A96E]" />
                      <span className="font-['Inter'] text-xs uppercase tracking-[0.2em] text-white/40">Trending</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TRENDING.map((term, i) => (
                        <motion.button
                          key={term}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * i, duration: 0.4 }}
                          onClick={() => handleTrendingClick(term)}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-['Inter'] text-sm text-white/60 transition-all duration-200 hover:border-[#C9A96E]/40 hover:text-[#C9A96E] hover:bg-[#C9A96E]/5"
                        >
                          {term}
                        </motion.button>
                      ))}
                    </div>

                    {/* AI Suggestions */}
                    <div className="mt-8">
                      <div className="mb-4 flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-[#C9A96E]" />
                        <span className="font-['Inter'] text-xs uppercase tracking-[0.2em] text-white/40">Style Assistant</span>
                      </div>
                      <div className="space-y-1">
                        {AI_SUGGESTIONS.map((s, i) => (
                          <motion.button
                            key={s}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + 0.05 * i, duration: 0.3 }}
                            onClick={() => handleInputChange(s)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 hover:bg-white/[0.05] group"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-[#C9A96E]/40 flex-shrink-0" />
                            <span className="font-['Inter'] text-sm text-white/40 group-hover:text-white/80 transition-colors">{s}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="mt-8">
                      <span className="mb-4 font-['Inter'] text-xs uppercase tracking-[0.2em] text-white/40 block">Browse Categories</span>
                      <div className="space-y-1">
                        {CATEGORIES.map((cat, i) => (
                          <motion.a
                            key={cat.name}
                            href={cat.href}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + 0.04 * i, duration: 0.3 }}
                            onClick={closeSearch}
                            className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors duration-200 hover:bg-white/[0.05] group"
                          >
                            <cat.icon className="h-4 w-4 text-white/30 group-hover:text-[#C9A96E] transition-colors" />
                            <span className="font-['Inter'] text-sm text-white/60 group-hover:text-white transition-colors">{cat.name}</span>
                            <ArrowRight className="h-3 w-3 ml-auto text-white/10 group-hover:text-[#C9A96E] transition-colors" />
                          </motion.a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
