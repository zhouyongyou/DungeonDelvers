class CacheMetrics {
  hits = 0;
  misses = 0;

  get hitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

export const cacheMetrics = new CacheMetrics();

// 定義 NFT 元數據類型
interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  [key: string]: unknown;
}

// 簡單的內存緩存實現
const metadataCache = new Map<string, NFTMetadata>();

export const getCachedMetadata = (key: string): NFTMetadata | null => {
  const cached = metadataCache.get(key);
  if (cached) {
    cacheMetrics.recordHit();
    return cached;
  }
  cacheMetrics.recordMiss();
  return null;
};

export const setCachedMetadata = (key: string, metadata: NFTMetadata): void => {
  metadataCache.set(key, metadata);
};

export const clearCache = (): void => {
  metadataCache.clear();
  cacheMetrics.reset();
};

export const getCacheSize = (): number => {
  return metadataCache.size;
}; 