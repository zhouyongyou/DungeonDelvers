// cache/cacheStrategies.ts
// Cache metrics and strategies for NFT metadata caching

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  lastReset: Date;
}

export class CacheMetrics {
  private static hits = 0;
  private static misses = 0;
  private static lastReset = new Date();

  static recordHit(): void {
    this.hits++;
  }

  static recordMiss(): void {
    this.misses++;
  }

  static getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
      lastReset: this.lastReset
    };
  }

  static reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.lastReset = new Date();
  }
}

// Cache strategies
export const CacheStrategy = {
  MEMORY_ONLY: 'memory-only',
  INDEXED_DB: 'indexed-db',
  HYBRID: 'hybrid'
} as const;

export type CacheStrategy = typeof CacheStrategy[keyof typeof CacheStrategy];

// Cache configuration
export interface CacheConfig {
  strategy: CacheStrategy;
  maxMemorySize?: number;
  ttl?: number; // Time to live in milliseconds
  maxIndexedDBSize?: number;
}

export const defaultCacheConfig: CacheConfig = {
  strategy: CacheStrategy.INDEXED_DB,
  maxMemorySize: 100, // Max 100 items in memory
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  maxIndexedDBSize: 1000 // Max 1000 items in IndexedDB
};