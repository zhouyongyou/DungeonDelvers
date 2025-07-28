// src/utils/imagePreloadStrategy.ts - 圖片預加載策略

import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';

interface PreloadConfig {
  priority: 'high' | 'medium' | 'low';
  maxConcurrent: number;
}

interface QueuedPreload extends PreloadConfig {
  url: string;
  resolve: () => void;
  reject: (err: Error) => void;
}

class ImagePreloadManager {
  private preloadQueue: Map<string, QueuedPreload> = new Map();
  private loadingImages: Set<string> = new Set();
  private loadedImages: Set<string> = new Set();

  /**
   * 預加載單張圖片
   */
  async preloadImage(url: string, config: PreloadConfig = { priority: 'medium', maxConcurrent: 3 }): Promise<void> {
    // 如果已經加載過，直接返回
    if (this.loadedImages.has(url)) {
      return Promise.resolve();
    }

    // 如果正在加載中，等待
    if (this.loadingImages.has(url)) {
      return this.waitForImage(url);
    }

    // 檢查並發限制 - 加入隊列但不遞歸調用
    if (this.loadingImages.size >= config.maxConcurrent) {
      return new Promise((resolve, reject) => {
        this.preloadQueue.set(url, { 
          ...config,
          url,
          resolve, 
          reject 
        });
      });
    }

    // 開始加載
    return this.loadImageInternal(url, config);
  }

  /**
   * 內部圖片加載方法（避免遞歸）
   */
  private loadImageInternal(url: string, config: PreloadConfig): Promise<void> {
    this.loadingImages.add(url);
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const loadTime = performance.now() - startTime;
        performanceMonitor.recordMetric({
          name: 'image-load',
          value: loadTime,
          timestamp: Date.now(),
          category: 'load',
          unit: 'ms',
        });
        
        this.loadingImages.delete(url);
        this.loadedImages.add(url);
        this.processQueue();
        resolve();
      };

      img.onerror = () => {
        const loadTime = performance.now() - startTime;
        performanceMonitor.recordMetric({
          name: 'image-load-error',
          value: loadTime,
          timestamp: Date.now(),
          category: 'load',
          unit: 'ms',
        });
        
        this.loadingImages.delete(url);
        this.processQueue();
        reject(new Error(`Failed to preload image: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * 批量預加載圖片
   */
  async preloadImages(urls: string[], config?: PreloadConfig): Promise<void[]> {
    const promises = urls.map(url => this.preloadImage(url, config).catch(err => {
      logger.warn('圖片預加載失敗', { url, error: err });
      return null;
    }));

    return Promise.all(promises);
  }

  /**
   * 等待圖片加載完成
   */
  private waitForImage(url: string): Promise<void> {
    return new Promise((resolve) => {
      // TEMP_DISABLED: 暫時禁用圖片加載檢查輪詢以避免 RPC 過載
      /*
      const checkInterval = setInterval(() => {
        if (!this.loadingImages.has(url)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      */
      // 直接解析以避免無限等待
      resolve();
    });
  }

  /**
   * 等待加載槽位
   */
  private waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      // TEMP_DISABLED: 暫時禁用加載槽位檢查輪詢以避免 RPC 過載
      /*
      const checkInterval = setInterval(() => {
        if (this.loadingImages.size < 3) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      */
      // 直接解析以避免無限等待
      resolve();
    });
  }

  /**
   * 處理預加載隊列
   */
  private processQueue() {
    if (this.preloadQueue.size === 0 || this.loadingImages.size >= 3) return;

    // 按優先級排序
    const sortedQueue = Array.from(this.preloadQueue.entries()).sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      return priorityMap[b[1].priority] - priorityMap[a[1].priority];
    });

    // 取出最高優先級的圖片
    const [url, queuedItem] = sortedQueue[0];
    this.preloadQueue.delete(url);

    // 使用內部方法加載，避免遞歸
    this.loadImageInternal(url, queuedItem)
      .then(() => queuedItem.resolve())
      .catch((err) => queuedItem.reject(err));
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.loadedImages.clear();
  }

  /**
   * 獲取統計信息
   */
  getStats() {
    return {
      loaded: this.loadedImages.size,
      loading: this.loadingImages.size,
      queued: this.preloadQueue.size,
    };
  }
}

// 創建單例
export const imagePreloadManager = new ImagePreloadManager();

/**
 * 預加載關鍵圖片
 */
export async function preloadCriticalImages() {
  const criticalImages = [
    // Logo 和品牌圖片
    '/images/logo.png',
    '/images/logo-dark.png',
    
    // 占位圖
    '/images/placeholder.png',
    '/images/hero/hero-placeholder.png',
    '/images/relic/relic-placeholder.png',
    
    // 常用圖標
    '/images/icons/hero.svg',
    '/images/icons/relic.svg',
    '/images/icons/party.svg',
  ];

  await imagePreloadManager.preloadImages(criticalImages, { priority: 'high', maxConcurrent: 5 });
  logger.info('關鍵圖片預加載完成');
}

/**
 * 預加載 NFT 圖片（按稀有度）
 */
export async function preloadNftImagesByRarity(type: 'hero' | 'relic', rarities: number[]) {
  const urls = rarities.map(rarity => `/images/${type}/${type}-${rarity}.png`);
  await imagePreloadManager.preloadImages(urls, { priority: 'medium', maxConcurrent: 3 });
}

/**
 * 智能預加載策略
 */
export function setupSmartPreloading() {
  let preloadTimer: NodeJS.Timeout | null = null;
  
  // 監聽路由變化，預加載相關圖片（使用防抖）
  window.addEventListener('hashchange', () => {
    if (preloadTimer) {
      clearTimeout(preloadTimer);
    }
    
    preloadTimer = setTimeout(() => {
      const hash = window.location.hash;
      
      if (hash.includes('mint')) {
        // 預加載鑄造頁面相關圖片
        preloadNftImagesByRarity('hero', [1, 2, 3]).catch(err => 
          logger.warn('Mint page preload failed', err)
        );
        preloadNftImagesByRarity('relic', [1, 2, 3]).catch(err => 
          logger.warn('Mint page relic preload failed', err)
        );
      } else if (hash.includes('party')) {
        // 預加載隊伍頁面相關圖片
        preloadNftImagesByRarity('hero', [1, 2, 3, 4, 5]).catch(err => 
          logger.warn('Party page hero preload failed', err)
        );
        preloadNftImagesByRarity('relic', [1, 2, 3, 4, 5]).catch(err => 
          logger.warn('Party page relic preload failed', err)
        );
      }
    }, 300); // 300ms 防抖延遲
  });

  // 使用 Intersection Observer 預加載即將進入視窗的圖片
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src && !img.src) {
            imagePreloadManager.preloadImage(src, { priority: 'low', maxConcurrent: 2 })
              .catch(err => logger.warn('Lazy load failed', { src, err }));
          }
        }
      });
    }, {
      rootMargin: '50px',
    });

    // 可以在這裡添加需要觀察的圖片元素
  }
}