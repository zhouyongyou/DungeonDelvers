/**
 * 簡化的 NFT Metadata 快取
 */

// NFT Metadata 類型定義
export interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  [key: string]: unknown;
}

// 簡化的記憶體快取
const memoryCache = new Map<string, CacheItem>();

// 簡化的快取配置
const CACHE_CONFIG = {
  MAX_SIZE: 100, // 最大快取項目數
  TTL: 30 * 60 * 1000, // 30分鐘過期
} as const;

// 快取項目類型
interface CacheItem {
  data: NFTMetadata;
  timestamp: number;
}

// 簡化的快取管理
export const nftMetadataCache = {
  // 獲取快取數據
  get(key: string): NFTMetadata | null {
    const item = memoryCache.get(key);
    
    if (!item) {
      return null;
    }
    
    // 檢查是否過期
    if (Date.now() - item.timestamp > CACHE_CONFIG.TTL) {
      memoryCache.delete(key);
      return null;
    }
    
    return item.data;
  },
  
  // 設置快取數據
  set(key: string, data: NFTMetadata): void {
    // 如果快取已滿，刪除最舊的項目
    if (memoryCache.size >= CACHE_CONFIG.MAX_SIZE) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }
    
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  },
  
  // 刪除快取
  delete(key: string): void {
    memoryCache.delete(key);
  },
  
  // 清空所有快取
  clear(): void {
    memoryCache.clear();
  },
  
  // 獲取快取統計
  getStats() {
    return {
      size: memoryCache.size,
      maxSize: CACHE_CONFIG.MAX_SIZE,
      ttl: CACHE_CONFIG.TTL,
    };
  },
};