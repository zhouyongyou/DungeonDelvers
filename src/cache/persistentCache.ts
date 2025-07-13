import { logger } from '../utils/logger';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  maxMemoryItems?: number;
  defaultTTL?: number;
  dbName?: string;
  storeName?: string;
}

export class PersistentCache<T> {
  private memoryCache: Map<string, CacheItem<T>> = new Map();
  private config: Required<CacheConfig>;
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxMemoryItems: config.maxMemoryItems || 1000,
      defaultTTL: config.defaultTTL || 1000 * 60 * 30, // 30 分鐘
      dbName: config.dbName || 'DungeonDelversCache',
      storeName: config.storeName || 'cache',
    };

    this.dbReady = this.initDB();
  }

  private async initDB(): Promise<void> {
    try {
      const request = indexedDB.open(this.config.dbName, 1);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB:', request.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          db.createObjectStore(this.config.storeName, { keyPath: 'key' });
        }
      };

      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      logger.error('IndexedDB initialization failed:', error);
    }
  }

  async get(key: string): Promise<T | null> {
    // 1. 檢查記憶體快取
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem) {
      if (this.isValid(memoryItem)) {
        return memoryItem.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // 2. 檢查 IndexedDB
    await this.dbReady;
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.get(key);

      const result = await new Promise<{ key: string; value: CacheItem<T> } | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (result && this.isValid(result.value)) {
        // 恢復到記憶體快取
        this.updateMemoryCache(key, result.value);
        return result.value.data;
      }
    } catch (error) {
      logger.error('Failed to read from IndexedDB:', error);
    }

    return null;
  }

  async set(key: string, data: T, ttl?: number): Promise<void> {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    // 1. 更新記憶體快取
    this.updateMemoryCache(key, cacheItem);

    // 2. 異步保存到 IndexedDB
    await this.dbReady;
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      await store.put({ key, value: cacheItem });
    } catch (error) {
      logger.error('Failed to write to IndexedDB:', error);
    }
  }

  async delete(key: string): Promise<void> {
    // 1. 從記憶體快取刪除
    this.memoryCache.delete(key);

    // 2. 從 IndexedDB 刪除
    await this.dbReady;
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      await store.delete(key);
    } catch (error) {
      logger.error('Failed to delete from IndexedDB:', error);
    }
  }

  async clear(): Promise<void> {
    // 1. 清空記憶體快取
    this.memoryCache.clear();

    // 2. 清空 IndexedDB
    await this.dbReady;
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      await store.clear();
    } catch (error) {
      logger.error('Failed to clear IndexedDB:', error);
    }
  }

  private isValid(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp < item.ttl;
  }

  private updateMemoryCache(key: string, item: CacheItem<T>): void {
    // LRU 驅逐策略
    if (this.memoryCache.size >= this.config.maxMemoryItems) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
    this.memoryCache.set(key, item);
  }

  // 獲取快取統計信息
  getStats(): { memorySize: number; isDBReady: boolean } {
    return {
      memorySize: this.memoryCache.size,
      isDBReady: this.db !== null,
    };
  }
}

// 創建專用快取實例
export const nftMetadataPersistentCache = new PersistentCache<any>({
  dbName: 'DungeonDelversNFT',
  storeName: 'metadata',
  defaultTTL: 1000 * 60 * 60 * 24 * 7, // 7 天
  maxMemoryItems: 500,
});

export const graphqlPersistentCache = new PersistentCache<any>({
  dbName: 'DungeonDelversGraphQL',
  storeName: 'queries',
  defaultTTL: 1000 * 60 * 5, // 5 分鐘
  maxMemoryItems: 100,
});