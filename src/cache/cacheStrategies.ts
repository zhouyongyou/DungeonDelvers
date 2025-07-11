/**
 * 簡化的快取策略
 */

// 簡化的快取配置
export const CACHE_CONFIG = {
  // 基本快取時間 (5分鐘)
  DEFAULT_STALE_TIME: 5 * 60 * 1000,
  DEFAULT_CACHE_TIME: 10 * 60 * 1000,
  
  // NFT 快取時間 (30分鐘，因為 NFT 數據變化較少)
  NFT_STALE_TIME: 30 * 60 * 1000,
  NFT_CACHE_TIME: 60 * 60 * 1000,
} as const;

// 簡化的快取策略
export const getQueryConfig = (type: 'DEFAULT' | 'NFT') => {
  switch (type) {
    case 'NFT':
      return {
        staleTime: CACHE_CONFIG.NFT_STALE_TIME,
        cacheTime: CACHE_CONFIG.NFT_CACHE_TIME,
        retry: 2,
        retryDelay: 1000,
      };
    default:
      return {
        staleTime: CACHE_CONFIG.DEFAULT_STALE_TIME,
        cacheTime: CACHE_CONFIG.DEFAULT_CACHE_TIME,
        retry: 1,
        retryDelay: 500,
      };
  }
};

// 簡化的快取指標
export class CacheMetrics {
  private hits = 0;
  private misses = 0;

  recordHit() {
    this.hits++;
  }

  recordMiss() {
    this.misses++;
  }

  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
    };
  }
}