// useRequestDeduper.ts - 請求去重機制
// 避免相同請求的重複執行，提升性能

import { useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logger';

// 請求去重器類型定義
interface RequestInfo {
  timestamp: number;
  promise: Promise<any>;
  result?: any;
  error?: Error;
}

interface DedupedQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  dedupWindow?: number; // 去重時間窗口（毫秒）
}

/**
 * 全域請求去重管理器
 * 使用單例模式確保全應用共享
 */
class RequestDeduper {
  private static instance: RequestDeduper;
  private pendingRequests: Map<string, RequestInfo> = new Map();
  private requestStats: Map<string, { count: number; lastRequest: number }> = new Map();

  private constructor() {}

  static getInstance(): RequestDeduper {
    if (!RequestDeduper.instance) {
      RequestDeduper.instance = new RequestDeduper();
    }
    return RequestDeduper.instance;
  }

  /**
   * 執行去重請求
   * @param key 請求唯一標識
   * @param requestFn 請求函數
   * @param dedupWindow 去重時間窗口（毫秒）
   */
  async dedupeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    dedupWindow: number = 1000
  ): Promise<T> {
    const now = Date.now();
    const existing = this.pendingRequests.get(key);

    // 統計請求頻率
    const stats = this.requestStats.get(key) || { count: 0, lastRequest: 0 };
    stats.count++;
    stats.lastRequest = now;
    this.requestStats.set(key, stats);

    // 如果存在相同的進行中請求且在時間窗口內，直接返回該請求
    if (existing && (now - existing.timestamp) < dedupWindow) {
      logger.debug(`Request deduped: ${key} (saved ${now - existing.timestamp}ms)`);
      return existing.promise;
    }

    // 創建新請求
    const promise = requestFn().finally(() => {
      // 請求完成後清理
      this.pendingRequests.delete(key);
    });

    // 記錄請求資訊
    this.pendingRequests.set(key, {
      timestamp: now,
      promise
    });

    logger.debug(`New request: ${key}`);
    return promise;
  }

  /**
   * 獲取請求統計資訊
   */
  getStats(): Record<string, { count: number; lastRequest: number }> {
    return Object.fromEntries(this.requestStats);
  }

  /**
   * 清理過期的統計資訊
   */
  cleanupStats(maxAge: number = 1000 * 60 * 10): void {
    const now = Date.now();
    for (const [key, stats] of this.requestStats.entries()) {
      if (now - stats.lastRequest > maxAge) {
        this.requestStats.delete(key);
      }
    }
  }
}

/**
 * 去重查詢 Hook
 * 在指定時間窗口內避免重複的相同查詢
 */
export function useDedupedQuery<T>(options: DedupedQueryOptions<T>) {
  const deduper = useMemo(() => RequestDeduper.getInstance(), []);
  const queryClient = useQueryClient();
  
  const {
    queryKey,
    queryFn,
    enabled = true,
    staleTime = 1000 * 30,
    cacheTime = 1000 * 60 * 5,
    dedupWindow = 1000
  } = options;

  const requestKey = useMemo(() => 
    JSON.stringify(queryKey), [queryKey]
  );

  return useQuery({
    queryKey,
    queryFn: () => deduper.dedupeRequest(requestKey, queryFn, dedupWindow),
    enabled,
    staleTime,
    cacheTime,
    
    // 網路錯誤重試策略
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      
      // 某些錯誤不應該重試
      if (error.message.includes('User rejected') || 
          error.message.includes('insufficient funds')) {
        return false;
      }
      
      return true;
    },
    
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  });
}

/**
 * 智能合約讀取去重 Hook
 * 專門針對合約讀取優化
 */
export function useDedupedContractRead<T>(
  contractAddress: `0x${string}` | undefined,
  functionName: string,
  args: readonly unknown[] = [],
  options: {
    enabled?: boolean;
    staleTime?: number;
    dedupWindow?: number;
  } = {}
) {
  const {
    enabled = true,
    staleTime = 1000 * 60, // 合約數據相對穩定，1分鐘緩存
    dedupWindow = 500 // 合約讀取去重窗口較短
  } = options;

  const queryKey = useMemo(() => [
    'contractRead',
    contractAddress,
    functionName,
    JSON.stringify(args)
  ], [contractAddress, functionName, args]);

  // 模擬合約讀取函數（實際使用時替換為真實的合約調用）
  const queryFn = async (): Promise<T> => {
    if (!contractAddress) {
      throw new Error('Contract address is required');
    }
    
    // TODO: 實際的合約讀取邏輯
    // 這裡應該使用 viem 或 wagmi 進行合約調用
    throw new Error('Contract read not implemented');
  };

  return useDedupedQuery({
    queryKey,
    queryFn,
    enabled: enabled && !!contractAddress,
    staleTime,
    dedupWindow
  });
}

/**
 * 子圖查詢去重 Hook
 * 專門針對 GraphQL 查詢優化
 */
export function useDedupedSubgraphQuery<T>(
  query: string,
  variables: Record<string, any> = {},
  options: {
    enabled?: boolean;
    staleTime?: number;
    dedupWindow?: number;
  } = {}
) {
  const {
    enabled = true,
    staleTime = 1000 * 60 * 2, // 子圖數據2分鐘緩存
    dedupWindow = 1000 // 子圖查詢去重窗口1秒
  } = options;

  const queryKey = useMemo(() => [
    'subgraphQuery',
    query,
    JSON.stringify(variables)
  ], [query, variables]);

  const queryFn = async (): Promise<T> => {
    // TODO: 實際的子圖查詢邏輯
    // 這裡應該使用 GraphQL 客戶端進行查詢
    throw new Error('Subgraph query not implemented');
  };

  return useDedupedQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime,
    dedupWindow
  });
}

/**
 * 請求統計 Hook
 * 用於監控和調試請求去重效果
 */
export function useRequestStats() {
  const deduper = useMemo(() => RequestDeduper.getInstance(), []);
  
  return {
    getStats: () => deduper.getStats(),
    cleanup: () => deduper.cleanupStats()
  };
}

/**
 * 批量去重 Hook
 * 針對需要同時發起多個請求的場景
 */
export function useBatchDedupedRequests<T>(
  requests: Array<{
    key: string;
    queryFn: () => Promise<T>;
    enabled?: boolean;
  }>,
  options: {
    dedupWindow?: number;
    parallel?: boolean;
  } = {}
) {
  const deduper = useMemo(() => RequestDeduper.getInstance(), []);
  const { dedupWindow = 1000, parallel = true } = options;

  const enabledRequests = requests.filter(req => req.enabled !== false);

  return useQuery({
    queryKey: ['batchDeduped', enabledRequests.map(r => r.key)],
    queryFn: async () => {
      const results: Record<string, T> = {};
      
      if (parallel) {
        // 並行執行所有請求
        const promises = enabledRequests.map(async (request) => {
          try {
            const result = await deduper.dedupeRequest(
              request.key,
              request.queryFn,
              dedupWindow
            );
            return { key: request.key, result, success: true };
          } catch (error) {
            logger.error(`Batch request failed: ${request.key}`, error);
            return { key: request.key, error, success: false };
          }
        });

        const responses = await Promise.allSettled(promises);
        responses.forEach((response) => {
          if (response.status === 'fulfilled' && response.value.success) {
            results[response.value.key] = response.value.result;
          }
        });
      } else {
        // 順序執行請求
        for (const request of enabledRequests) {
          try {
            results[request.key] = await deduper.dedupeRequest(
              request.key,
              request.queryFn,
              dedupWindow
            );
          } catch (error) {
            logger.error(`Sequential request failed: ${request.key}`, error);
          }
        }
      }

      return results;
    },
    enabled: enabledRequests.length > 0,
    staleTime: 1000 * 30,
    cacheTime: 1000 * 60 * 5
  });
}