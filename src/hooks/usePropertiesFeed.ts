import { useEffect, useState } from 'react';
import {
  fetchPropertyFeed,
  idbGet,
  idbSet,
  type PropertyFeedRecord,
} from '@/lib/propertiesFeed';

interface FeedCacheEntry {
  data: PropertyFeedRecord[];
  timestamp: number;
}

const CACHE_KEY = 'all-properties-feed';
/** Fresh enough to skip the network entirely. */
const MEMORY_TTL = 5 * 60 * 1000;

const memoryCache = new Map<string, FeedCacheEntry>();

function readMemory(key: string): FeedCacheEntry | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > MEMORY_TTL) {
    memoryCache.delete(key);
    return null;
  }
  return entry;
}

/**
 * Stale-while-revalidate property feed.
 * - Fresh memory cache  → instant, no network.
 * - IndexedDB cache     → instant paint, background revalidation.
 * - Nothing cached      → skeleton until the one-shot fetch resolves.
 * Never opens a realtime listener; data refreshes on each page visit.
 */
export function usePropertiesFeed() {
  const [feed, setFeed] = useState<PropertyFeedRecord[]>(() => {
    return readMemory(CACHE_KEY)?.data ?? [];
  });
  const [loading, setLoading] = useState(() => {
    return readMemory(CACHE_KEY) === null;
  });

  useEffect(() => {
    let disposed = false;

    const apply = (docs: PropertyFeedRecord[], now: number) => {
      if (disposed) return;
      memoryCache.set(CACHE_KEY, { data: docs, timestamp: now });
      setFeed(docs);
      setLoading(false);
      void idbSet(CACHE_KEY, { data: docs, timestamp: now } satisfies FeedCacheEntry);
    };

    const revalidate = async () => {
      try {
        const docs = await fetchPropertyFeed();
        if (!disposed) apply(docs, Date.now());
      } catch {
        // Keep whatever we have; if nothing was cached, stop the skeleton.
        if (!memoryCache.has(CACHE_KEY) && !disposed) setLoading(false);
      }
    };

    const hydrate = async () => {
      const cached = await idbGet<FeedCacheEntry>(CACHE_KEY);
      if (disposed) return;

      if (cached && cached.data.length > 0) {
        const age = Date.now() - cached.timestamp;
        // Instant paint from IndexedDB…
        if (!readMemory(CACHE_KEY)) {
          memoryCache.set(CACHE_KEY, cached);
          setFeed(cached.data);
          setLoading(false);
        }
        // …then refresh in the background whenever it's beyond the fresh
        // window, so stale-but-usable cache always gets revalidated.
        if (age > MEMORY_TTL) void revalidate();
      } else {
        void revalidate();
      }
    };

    const mem = readMemory(CACHE_KEY);
    if (mem) {
      // Fresh in memory — but quietly revalidate once per visit so the
      // listing never goes stale for long.
      const timer = window.setTimeout(() => void revalidate(), 1200);
      return () => {
        disposed = true;
        window.clearTimeout(timer);
      };
    }

    void hydrate();

    return () => {
      disposed = true;
    };
  }, []);

  return { properties: feed, loading };
}
