import { imageCache } from './imageCache';
import { getOptimizedImageUrl, ImageType } from './imageUtils';

interface PreloadConfig {
  imageId: string | number | string[] | null | undefined;
  type: ImageType;
  priority?: number; // Higher priority loads first
}

/**
 * Preloads critical images for faster initial render
 */
export class ImagePreloader {
  private queue: Array<{ url: string; priority: number }> = [];
  private loading = false;
  private maxConcurrent = 3;
  private currentLoading = 0;

  /**
   * Add images to preload queue
   */
  add(configs: PreloadConfig[]): void {
    const items = configs
      .map(config => {
        const imageId = typeof config.imageId === 'number' ? String(config.imageId) :
                       Array.isArray(config.imageId) ? config.imageId[0] :
                       config.imageId;
        const url = getOptimizedImageUrl(imageId, config.type);
        return url ? { url, priority: config.priority || 0 } : null;
      })
      .filter((item): item is { url: string; priority: number } => item !== null);

    // Sort by priority (higher first)
    items.sort((a, b) => b.priority - a.priority);

    this.queue.push(...items);
    this.processQueue();
  }

  /**
   * Add a single image with high priority
   */
  addPriority(imageId: string | number | null | undefined, type: ImageType = 'cover'): void {
    this.add([{ imageId, type, priority: 100 }]);
  }

  /**
   * Process the preload queue
   */
  private async processQueue(): Promise<void> {
    if (this.loading) return;
    this.loading = true;

    while (this.queue.length > 0 && this.currentLoading < this.maxConcurrent) {
      const item = this.queue.shift();
      if (!item) break;

      this.currentLoading++;
      imageCache
        .preload(item.url)
        .catch(err => console.warn('Preload failed:', err))
        .finally(() => {
          this.currentLoading--;
          this.processQueue();
        });
    }

    if (this.currentLoading === 0) {
      this.loading = false;
    }
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      currentLoading: this.currentLoading,
      isLoading: this.loading,
    };
  }
}

// Global preloader instance
export const imagePreloader = new ImagePreloader();

/**
 * Preload merchant cover images
 */
export function preloadMerchantImages(merchants: Array<{
  coverImageIds?: (string | number)[];
  logoId?: string | number;
}>, count: number = 3): void {
  const configs: PreloadConfig[] = [];

  merchants.slice(0, count).forEach((merchant, index) => {
    // Preload first cover image with priority based on position
    if (merchant.coverImageIds && merchant.coverImageIds.length > 0) {
      configs.push({
        imageId: merchant.coverImageIds[0],
        type: 'cover',
        priority: 100 - index * 10, // First merchant gets highest priority
      });
    }

    // Preload logo
    if (merchant.logoId) {
      configs.push({
        imageId: merchant.logoId,
        type: 'logo',
        priority: 50 - index * 5,
      });
    }
  });

  imagePreloader.add(configs);
}

/**
 * Preload deal images
 */
export function preloadDealImages(deals: Array<{
  imageUrl?: string | number;
}>, count: number = 3): void {
  const configs: PreloadConfig[] = deals
    .slice(0, count)
    .map((deal, index) => ({
      imageId: deal.imageUrl,
      type: 'deal' as ImageType,
      priority: 80 - index * 10,
    }));

  imagePreloader.add(configs);
}
