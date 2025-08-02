// src/utils/imageOptimizer.ts - 圖片優化和智能預加載

interface ImageCacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
  usage: number;
}

class ImageCache {
  private cache = new Map<string, ImageCacheEntry>();
  private maxSize = 50; // 最多緩存 50 張圖片
  private maxAge = 30 * 60 * 1000; // 30分鐘過期

  async get(url: string): Promise<string | null> {
    const entry = this.cache.get(url);
    if (!entry) return null;

    // 檢查是否過期
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(url);
      return null;
    }

    // 增加使用次數
    entry.usage++;
    return URL.createObjectURL(entry.blob);
  }

  async set(url: string, blob: Blob): Promise<void> {
    // 清理空間
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(url, {
      url,
      blob,
      timestamp: Date.now(),
      usage: 1,
    });
  }

  private evictLeastUsed(): void {
    let leastUsed: string | null = null;
    let minUsage = Infinity;

    for (const [url, entry] of this.cache) {
      if (entry.usage < minUsage) {
        minUsage = entry.usage;
        leastUsed = url;
      }
    }

    if (leastUsed) {
      this.cache.delete(leastUsed);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

class ImagePreloader {
  private preloadQueue: string[] = [];
  private isProcessing = false;
  private cache = new ImageCache();

  // 智能預加載：預測用戶可能查看的圖片
  async preloadImages(urls: string[], priority: 'high' | 'low' = 'low'): Promise<void> {
    if (priority === 'high') {
      // 高優先級圖片插入到隊列前面
      this.preloadQueue.unshift(...urls);
    } else {
      this.preloadQueue.push(...urls);
    }

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.preloadQueue.length > 0) {
      const url = this.preloadQueue.shift()!;
      
      // 檢查是否已緩存
      if (await this.cache.get(url)) {
        continue;
      }

      try {
        await this.preloadSingleImage(url);
        
        // 避免阻塞主線程
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.warn(`預加載圖片失敗: ${url}`, error);
      }
    }

    this.isProcessing = false;
  }

  private async preloadSingleImage(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      await this.cache.set(url, blob);
    } catch (error) {
      console.warn(`無法預加載圖片: ${url}`, error);
    }
  }

  async getCachedImage(url: string): Promise<string | null> {
    return this.cache.get(url);
  }

  // 清理緩存
  clearCache(): void {
    this.cache.clear();
  }
}

// 全局實例
const imagePreloader = new ImagePreloader();

// 智能預加載策略
export const preloadStrategy = {
  // NFT 卡片策略：預加載相鄰的圖片
  async preloadNftImages(currentIndex: number, nftList: Array<{ image?: string }>): Promise<void> {
    const preloadUrls: string[] = [];
    
    // 預加載前後各 3 張圖片
    for (let i = Math.max(0, currentIndex - 3); i <= Math.min(nftList.length - 1, currentIndex + 3); i++) {
      if (i !== currentIndex && nftList[i]?.image) {
        preloadUrls.push(nftList[i].image!);
      }
    }
    
    await imagePreloader.preloadImages(preloadUrls, 'low');
  },

  // 市場頁面策略：預加載下一頁的圖片
  async preloadMarketplaceImages(items: Array<{ nft?: { image?: string } }>): Promise<void> {
    const preloadUrls = items
      .map(item => item.nft?.image)
      .filter((url): url is string => Boolean(url));
    
    await imagePreloader.preloadImages(preloadUrls, 'low');
  },

  // 關鍵圖片高優先級預加載
  async preloadCriticalImages(urls: string[]): Promise<void> {
    await imagePreloader.preloadImages(urls, 'high');
  },

  // 獲取緩存的圖片
  async getCachedImage(url: string): Promise<string | null> {
    return imagePreloader.getCachedImage(url);
  },

  // 清理緩存
  clearCache(): void {
    imagePreloader.clearCache();
  }
};

// 響應式圖片工具
export const imageUtils = {
  // 根據屏幕大小選擇合適的圖片尺寸
  getOptimalImageSize(baseUrl: string, containerWidth: number): string {
    // 根據設備像素比和容器寬度選擇合適的圖片
    const devicePixelRatio = window.devicePixelRatio || 1;
    const targetWidth = Math.ceil(containerWidth * devicePixelRatio);

    // 選擇最接近的標準尺寸
    const standardSizes = [150, 300, 600, 1200];
    const optimalSize = standardSizes.find(size => size >= targetWidth) || standardSizes[standardSizes.length - 1];

    // 如果 URL 支持尺寸參數，返回優化的 URL
    if (baseUrl.includes('ipfs://') || baseUrl.includes('.json')) {
      return baseUrl; // IPFS 和 metadata URL 保持原樣
    }

    // 對於支持尺寸參數的 URL，添加尺寸參數
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set('w', optimalSize.toString());
    url.searchParams.set('q', '80'); // 質量參數
    
    return url.toString();
  },

  // WebP 格式支持檢測
  supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
      const webp = new Image();
      webp.onload = webp.onerror = () => {
        resolve(webp.height === 2);
      };
      webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  },

  // 獲取 WebP 版本的 URL（如果支持）
  async getWebPUrl(originalUrl: string): Promise<string> {
    const supportsWebP = await this.supportsWebP();
    if (!supportsWebP) return originalUrl;

    // 如果 URL 支持 WebP 轉換，返回 WebP 版本
    if (originalUrl.includes('/images/')) {
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }

    return originalUrl;
  }
};

// 懶加載觀察器管理
export class LazyLoadManager {
  private observer: IntersectionObserver;
  private callbacks = new Map<Element, () => void>();

  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = this.callbacks.get(entry.target);
            if (callback) {
              callback();
              this.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: '100px', // 提前 100px 觸發
        threshold: 0.1,
      }
    );
  }

  observe(element: Element, callback: () => void): void {
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    this.callbacks.delete(element);
    this.observer.unobserve(element);
  }

  disconnect(): void {
    this.observer.disconnect();
    this.callbacks.clear();
  }
}

// 全局懶加載管理器
export const globalLazyLoader = new LazyLoadManager();