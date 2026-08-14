'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/ui-store';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, TrendingUp, ArrowRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
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
/* Constants                                                           */
/* ------------------------------------------------------------------ */
const TRENDING = [
  'Silk Gown',
  'Leather Bag',
  'Cashmere Coat',
  'Gold Necklace',
  'Designer Heels',
  'Diamond Earrings',
  'Tailored Blazer',
  'Evening Clutch',
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
    transition: {
      delay: 0.04 * i,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function SearchOverlay() {
  const searchOpen = useUIStore((s) => s.searchOpen);
  const closeSearch = useUIStore((s) => s.closeSearch);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on open
  useEffect(() => {
    if (searchOpen) {
      // Small delay to allow animation to start
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  // Reset state on close
  useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setLoading(false);
    }
  }, [searchOpen]);

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchOpen) {
        closeSearch();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [searchOpen, closeSearch]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
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
    [doSearch]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTrendingClick = (term: string) => {
    handleInputChange(term);
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          key="search-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-2xl"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSearch();
          }}
        >
          <div className="mx-auto flex h-full max-w-5xl flex-col px-6 pt-24 md:pt-32">
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
                  className="w-full border-b-2 border-white/20 bg-transparent py-5 pl-14 pr-14 font-['Playfair_Display'] text-2xl md:text-3xl text-white placeholder:text-white/25 outline-none transition-colors duration-300 focus:border-[#C9A96E]/60"
                />
                <button
                  onClick={closeSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  aria-label="Close search"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </motion.div>

            {/* Results / Trending */}
            <motion.div
              variants={resultsVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex-1 overflow-y-auto pb-12 pt-10"
            >
              {loading && (
                <div className="flex items-center gap-3 text-white/40 font-['Inter'] text-sm">
                  <motion.div
                    className="h-1 w-1 rounded-full bg-[#C9A96E]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                  <motion.div
                    className="h-1 w-1 rounded-full bg-[#C9A96E]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                  <motion.div
                    className="h-1 w-1 rounded-full bg-[#C9A96E]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.3 }}
                  />
                  <span className="ml-2">Searching...</span>
                </div>
              )}

              {/* Results grid */}
              {!loading && results.length > 0 && (
                <div>
                  <p className="mb-6 font-['Inter'] text-xs uppercase tracking-[0.2em] text-white/40">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {results.map((item, i) => (
                      <motion.button
                        key={item.id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={closeSearch}
                        className="group flex gap-4 rounded-lg bg-white/[0.03] p-3 text-left transition-colors duration-200 hover:bg-white/[0.07]"
                      >
                        {/* Thumbnail */}
                        <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded bg-white/5">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Search className="h-4 w-4 text-white/20" />
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col justify-center">
                          <p className="font-['Inter'] text-sm font-medium text-white/90 truncate">
                            {item.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            {item.brand && (
                              <span className="font-['Inter'] text-xs text-[#C9A96E] uppercase tracking-wider truncate">
                                {item.brand}
                              </span>
                            )}
                            {item.category && (
                              <span className="font-['Inter'] text-xs text-white/30 truncate">
                                · {item.category}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 font-['Inter'] text-sm font-medium text-white/70">
                            ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <ArrowRight className="mt-auto h-4 w-4 flex-shrink-0 self-end text-white/20 transition-colors group-hover:text-[#C9A96E]" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {!loading && hasSearched && results.length === 0 && query.length >= 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <p className="font-['Playfair_Display'] text-xl text-white/60">
                    No results found
                  </p>
                  <p className="mt-2 font-['Inter'] text-sm text-white/30">
                    Try a different search term or browse our collections
                  </p>
                </motion.div>
              )}

              {/* Trending suggestions */}
              {!loading && !hasSearched && (
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-[#C9A96E]" />
                    <span className="font-['Inter'] text-xs uppercase tracking-[0.2em] text-white/40">
                      Trending
                    </span>
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
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
