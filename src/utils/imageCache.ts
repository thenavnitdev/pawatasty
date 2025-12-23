/**
 * Image caching utilities for faster loading
 */

interface CacheEntry {
  url: string;
  blob?: Blob;
  timestamp: number;
  loading?: Promise<Blob>;
}

class ImageCache {
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 50; // Maximum number of images to cache
  private maxCacheAge = 30 * 60 * 1000; // 30 minutes

  /**
   * Preload an image and store it in cache
   */
  async preload(url: string): Promise<void> {
    if (this.cache.has(url)) {
      return; // Already cached or loading
    }

    // Mark as loading
    const loadingPromise = this.fetchImage(url);
    this.cache.set(url, {
      url,
      timestamp: Date.now(),
      loading: loadingPromise,
    });

    try {
      const blob = await loadingPromise;
      this.cache.set(url, {
        url,
        blob,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Remove failed entry
      this.cache.delete(url);
      console.warn(`Failed to preload image: ${url}`, error);
    }
  }

  /**
   * Get cached image URL or original URL
   */
  async get(url: string): Promise<string> {
    const entry = this.cache.get(url);

    if (!entry) {
      // Start preloading for next time
      this.preload(url).catch(() => {});
      return url;
    }

    // If still loading, wait for it
    if (entry.loading && !entry.blob) {
      try {
        entry.blob = await entry.loading;
        delete entry.loading;
      } catch {
        return url;
      }
    }

    // Check if cache is still valid
    if (entry.blob && Date.now() - entry.timestamp < this.maxCacheAge) {
      return URL.createObjectURL(entry.blob);
    }

    // Cache expired, return original and refresh
    this.preload(url).catch(() => {});
    return url;
  }

  /**
   * Fetch image as blob
   */
  private async fetchImage(url: string): Promise<Blob> {
    const response = await fetch(url, {
      mode: 'cors',
      cache: 'force-cache',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Preload multiple images
   */
  async preloadBatch(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.preload(url));
    await Promise.allSettled(promises);
  }

  /**
   * Clear old cache entries
   */
  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > this.maxCacheAge) {
        if (entry.blob) {
          URL.revokeObjectURL(URL.createObjectURL(entry.blob));
        }
        this.cache.delete(key);
      }
    });

    // If still too large, remove oldest entries
    if (this.cache.size > this.maxCacheSize) {
      const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = sorted.slice(0, this.cache.size - this.maxCacheSize);

      toRemove.forEach(([key, entry]) => {
        if (entry.blob) {
          URL.revokeObjectURL(URL.createObjectURL(entry.blob));
        }
        this.cache.delete(key);
      });
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.forEach(entry => {
      if (entry.blob) {
        URL.revokeObjectURL(URL.createObjectURL(entry.blob));
      }
    });
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      urls: Array.from(this.cache.keys()),
    };
  }
}

// Global image cache instance
export const imageCache = new ImageCache();

// Cleanup cache periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    imageCache['cleanup']();
  }, 5 * 60 * 1000); // Every 5 minutes
}
