/**
 * In-memory LRU cache for optimized image URLs.
 *
 * Building a transformed URL (preset resolution + query string) is cheap, but
 * calling it on every render for every image (grids of cards, detail
 * galleries, admin lists) adds up. Caching by (url, preset, device) also
 * guarantees that identical images in the same session resolve to identical
 * URLs, so the browser and CDN can reuse one cached response.
 */

class ImageURLCache {
  private cache = new Map<string, string>();
  private readonly maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get(key: string): string | null {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Refresh recency so hot entries survive eviction.
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key: string, value: string): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const imageURLCache = new ImageURLCache();

/** Build the cache key for an optimized URL lookup/store. */
export function imageCacheKey(
  baseUrl: string,
  preset: string,
  device: string,
  suffix = '',
): string {
  return `${baseUrl}__${preset}__${device}${suffix}`;
}

export function getCachedOptimizedUrl(
  fullUrl: string,
  preset: string,
  device: string,
  suffix = '',
): string | null {
  return imageURLCache.get(imageCacheKey(fullUrl, preset, device, suffix));
}

export function setCachedOptimizedUrl(
  fullUrl: string,
  preset: string,
  device: string,
  optimizedUrl: string,
  suffix = '',
): void {
  imageURLCache.set(imageCacheKey(fullUrl, preset, device, suffix), optimizedUrl);
}
