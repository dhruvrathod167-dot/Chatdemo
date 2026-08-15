import { useState, useEffect } from 'react';

/**
 * Returns `false` during SSR and the first client render, then `true` after
 * React has finished hydrating. Use this to prevent hydration mismatches
 * with Zustand `persist` stores (localStorage) or other client-only state.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
