// src/hooks/useRPCOptimization.ts - RPC 優化 Hook

import { useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface RPCCache {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl: number;
  };
}

interface RPCQueueItem {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: number;
}

class RPCOptimizer {
  private cache: RPCCache = {};
  private queue: RPCQueueItem[] = [];
  private isProcessing = false;
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly maxRequestsPerMinute = 50; // 調整請求限制
  private readonly queueProcessDelay = 100; // 隊列處理延遲(ms)

  // 緩存管理
  setCache(key: string, data: any, ttl: number = 30000) {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      ttl
    };
  }

  getCache(key: string): any | null {
    const cached = this.cache[key];
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      delete this.cache[key];
      return null;
    }
    
    return cached.data;
  }

  // 請求限制檢查
  private canMakeRequest(): boolean {
    const now = Date.now();
    
    // 重置計數器（每分鐘）
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    return this.requestCount < this.maxRequestsPerMinute;
  }

  // 添加請求到隊列
  queueRequest<T>(
    fn: () => Promise<T>, 
    cacheKey?: string, 
    cacheTTL: number = 30000,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // 檢查緩存
      if (cacheKey) {
        const cached = this.getCache(cacheKey);
        if (cached) {
          resolve(cached);
          return;
        }
      }

      // 添加到隊列
      this.queue.push({
        fn: async () => {
          try {
            const result = await fn();
            if (cacheKey) {
              this.setCache(cacheKey, result, cacheTTL);
            }
            return result;
          } catch (error) {
            throw error;
          }
        },
        resolve,
        reject,
        priority
      });

      // 按優先級排序
      this.queue.sort((a, b) => b.priority - a.priority);
      
      this.processQueue();
    });
  }

  // 處理隊列
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      if (!this.canMakeRequest()) {
        // 等待直到可以發送請求
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const item = this.queue.shift();
      if (!item) break;

      try {
        this.requestCount++;
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        // 如果是429錯誤，重新加入隊列
        if (error instanceof Error && error.message.includes('429')) {
          this.queue.unshift(item);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
          continue;
        }
        item.reject(error);
      }

      // 延遲處理下一個請求
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.queueProcessDelay));
      }
    }
    
    this.isProcessing = false;
  }

  // 清理過期緩存
  cleanExpiredCache() {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      const cached = this.cache[key];
      if (now - cached.timestamp > cached.ttl) {
        delete this.cache[key];
      }
    });
  }
}

// 全局實例
const rpcOptimizer = new RPCOptimizer();

// 定期清理緩存
setInterval(() => {
  rpcOptimizer.cleanExpiredCache();
}, 60000); // 每分鐘清理一次

export const useRPCOptimization = () => {
  const queryClient = useQueryClient();
  
  const optimizedRequest = useMemo(() => {
    return <T>(
      requestFn: () => Promise<T>,
      cacheKey?: string,
      options?: {
        cacheTTL?: number;
        priority?: number;
        enableQueryClientCache?: boolean;
      }
    ): Promise<T> => {
      const { 
        cacheTTL = 30000, 
        priority = 0, 
        enableQueryClientCache = true 
      } = options || {};

      // 檢查 React Query 緩存
      if (enableQueryClientCache && cacheKey) {
        const queryCache = queryClient.getQueryData([cacheKey]);
        if (queryCache) {
          return Promise.resolve(queryCache as T);
        }
      }

      return rpcOptimizer.queueRequest(
        requestFn,
        cacheKey,
        cacheTTL,
        priority
      ).then((result) => {
        // 更新 React Query 緩存
        if (enableQueryClientCache && cacheKey) {
          queryClient.setQueryData([cacheKey], result);
        }
        return result;
      });
    };
  }, [queryClient]);

  const getBatchRequests = useMemo(() => {
    return <T>(
      requests: Array<() => Promise<T>>,
      cacheKeys?: string[],
      options?: { batchSize?: number; delay?: number }
    ): Promise<T[]> => {
      const { batchSize = 5, delay = 200 } = options || {};
      
      return new Promise(async (resolve, reject) => {
        const results: T[] = [];
        
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          const batchCacheKeys = cacheKeys?.slice(i, i + batchSize);
          
          try {
            const batchPromises = batch.map((request, index) => 
              optimizedRequest(
                request,
                batchCacheKeys?.[index],
                { priority: 1 }
              )
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // 批次間延遲
            if (i + batchSize < requests.length) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (error) {
            reject(error);
            return;
          }
        }
        
        resolve(results);
      });
    };
  }, [optimizedRequest]);

  return {
    optimizedRequest,
    getBatchRequests,
    clearCache: () => rpcOptimizer['cache'] = {},
    getQueueLength: () => rpcOptimizer['queue'].length
  };
};

// 使用示例：
/*
const { optimizedRequest, getBatchRequests } = useRPCOptimization();

// 單個請求
const data = await optimizedRequest(
  () => publicClient.readContract({...}),
  'contract-balance-key',
  { cacheTTL: 60000, priority: 1 }
);

// 批量請求
const results = await getBatchRequests([
  () => publicClient.readContract({...}),
  () => publicClient.readContract({...}),
], ['key1', 'key2'], { batchSize: 3, delay: 300 });
*/