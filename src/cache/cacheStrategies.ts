// cache/cacheStrategies.ts

interface CacheMetricsData {
    hits: number;
    misses: number;
    totalRequests: number;
    hitRate: number;
    lastUpdated: number;
}

class CacheMetricsManager {
    private metrics: CacheMetricsData = {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        hitRate: 0,
        lastUpdated: Date.now()
    };

    recordHit(): void {
        this.metrics.hits++;
        this.updateMetrics();
    }

    recordMiss(): void {
        this.metrics.misses++;
        this.updateMetrics();
    }

    private updateMetrics(): void {
        this.metrics.totalRequests = this.metrics.hits + this.metrics.misses;
        this.metrics.hitRate = this.metrics.totalRequests > 0 
            ? (this.metrics.hits / this.metrics.totalRequests) * 100 
            : 0;
        this.metrics.lastUpdated = Date.now();
    }

    getMetrics(): CacheMetricsData {
        return { ...this.metrics };
    }

    reset(): void {
        this.metrics = {
            hits: 0,
            misses: 0,
            totalRequests: 0,
            hitRate: 0,
            lastUpdated: Date.now()
        };
    }

    logMetrics(): void {
        const { hits, misses, totalRequests, hitRate } = this.metrics;
        console.log(`Cache Metrics: ${hits} hits, ${misses} misses, ${totalRequests} total requests, ${hitRate.toFixed(2)}% hit rate`);
    }
}

export const CacheMetrics = new CacheMetricsManager();

// Cache strategies for different scenarios
export enum CacheStrategy {
    PERMANENT = 'permanent',
    TTL = 'ttl',
    LRU = 'lru'
}

export interface CacheOptions {
    strategy: CacheStrategy;
    ttl?: number; // Time to live in milliseconds
    maxSize?: number; // Maximum cache size for LRU
}

export const defaultCacheOptions: CacheOptions = {
    strategy: CacheStrategy.PERMANENT,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 1000
};