import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ShortlistContextValue {
  shortlistedIds: string[];
  toggle: (id: string) => void;
  isShortlisted: (id: string) => boolean;
  clearAll: () => void;
}

const ShortlistContext = createContext<ShortlistContextValue | null>(null);

export function ShortlistProvider({ children }: { children: ReactNode }) {
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setShortlistedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const isShortlisted = useCallback(
    (id: string) => shortlistedIds.includes(id),
    [shortlistedIds],
  );

  const clearAll = useCallback(() => setShortlistedIds([]), []);

  return (
    <ShortlistContext.Provider value={{ shortlistedIds, toggle, isShortlisted, clearAll }}>
      {children}
    </ShortlistContext.Provider>
  );
}

export function useShortlist() {
  const ctx = useContext(ShortlistContext);
  if (!ctx) throw new Error('useShortlist must be used within ShortlistProvider');
  return ctx;
}
