// src/config/queryOptimization.ts - React Query 優化配置

import { QueryClient, QueryClientConfig } from '@tanstack/react-query';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../utils/performanceMonitor';

// 創建優化的 QueryClient 配置
export const createOptimizedQueryClient = (): QueryClient => {
  const queryClientConfig: QueryClientConfig = {
    defaultOptions: {
      queries: {
        // 緩存配置
        staleTime: 1000 * 60 * 5, // 5分鐘內不重新fetch
        gcTime: 1000 * 60 * 30, // 30分鐘後清理緩存
        
        // 重試配置
        retry: (failureCount, error) => {
          // 對於 RPC 錯誤，減少重試次數
          if (error?.message?.includes('RPC') || error?.message?.includes('network')) {
            return failureCount < 2;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // 自動刷新配置
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
        
        // 超時配置
        networkMode: 'online',
        
        // 性能監控
        onSuccess: (data, query) => {
          performanceMonitor.recordMetric({
            name: 'query-success',
            value: performance.now(),
            timestamp: Date.now(),
            category: 'network',
            unit: 'ms',
          });
        },
        
        onError: (error, query) => {
          performanceMonitor.recordMetric({
            name: 'query-error',
            value: performance.now(),
            timestamp: Date.now(),
            category: 'network',
            unit: 'ms',
          });
          logger.error('Query error:', error);
        },
      },
      
      mutations: {
        // 變異配置
        retry: 1,
        retryDelay: 1000,
        
        onSuccess: (data, variables, context) => {
          performanceMonitor.recordMetric({
            name: 'mutation-success',
            value: performance.now(),
            timestamp: Date.now(),
            category: 'network',
            unit: 'ms',
          });
        },
        
        onError: (error, variables, context) => {
          performanceMonitor.recordMetric({
            name: 'mutation-error',
            value: performance.now(),
            timestamp: Date.now(),
            category: 'network',
            unit: 'ms',
          });
          logger.error('Mutation error:', error);
        },
      },
    },
  };
  
  return new QueryClient(queryClientConfig);
};

// 查詢鍵生成工具
export const createQueryKey = (
  type: string,
  params: Record<string, any> = {},
  dependencies: any[] = []
): (string | any)[] => {
  const baseKey = [type];
  
  // 添加參數
  if (Object.keys(params).length > 0) {
    baseKey.push(params);
  }
  
  // 添加依賴
  if (dependencies.length > 0) {
    baseKey.push(...dependencies);
  }
  
  return baseKey;
};

// 批量查詢優化
export const createBatchQueryKey = (
  type: string,
  items: any[],
  batchSize: number = 10
): (string | any)[] => {
  // 對項目進行批處理
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  return createQueryKey(type, { batches });
};

// 頁面特定的查詢配置
export const getPageSpecificQueryConfig = (pageName: string) => {
  const baseConfig = {
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 2,
    retryDelay: 1000,
  };
  
  switch (pageName) {
    case 'admin':
      return {
        ...baseConfig,
        staleTime: 1000 * 60 * 30, // 30分鐘
        gcTime: 1000 * 60 * 60, // 60分鐘
        refetchOnWindowFocus: false,
        refetchInterval: false,
        retry: 1,
        retryDelay: 2000,
      };
      
    case 'dashboard':
      return {
        ...baseConfig,
        staleTime: 1000 * 60 * 2, // 2分鐘
        gcTime: 1000 * 60 * 15, // 15分鐘
        refetchOnWindowFocus: true,
        refetchInterval: 1000 * 60 * 5, // 5分鐘
      };
      
    case 'dungeon':
      return {
        ...baseConfig,
        staleTime: 1000 * 30, // 30秒
        gcTime: 1000 * 60 * 10, // 10分鐘
        refetchOnWindowFocus: true,
        refetchInterval: 1000 * 60 * 2, // 2分鐘
      };
      
    case 'mint':
      return {
        ...baseConfig,
        staleTime: 1000 * 60 * 10, // 10分鐘
        gcTime: 1000 * 60 * 30, // 30分鐘
        refetchOnWindowFocus: false,
        refetchInterval: false,
      };
      
    default:
      return baseConfig;
  }
};

// 緩存清理策略
export const setupCacheCleanup = (queryClient: QueryClient) => {
  // 定期清理過期緩存
  const cleanupInterval = setInterval(() => {
    queryClient.getQueryCache().clear();
    performanceMonitor.recordMetric({
      name: 'cache-cleanup',
      value: performance.now(),
      timestamp: Date.now(),
      category: 'memory',
      unit: 'ms',
    });
  }, 1000 * 60 * 30); // 30分鐘清理一次
  
  // 監聽頁面可見性變化
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // 頁面隱藏時清理部分緩存
      queryClient.getQueryCache().clear();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    clearInterval(cleanupInterval);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

// 智能預取策略
export const setupSmartPrefetch = (queryClient: QueryClient) => {
  // 基於用戶行為預測的預取
  const prefetchQueue = new Map<string, number>();
  
  const prefetchData = (queryKey: any[], queryFn: () => Promise<any>) => {
    const keyStr = JSON.stringify(queryKey);
    const lastPrefetch = prefetchQueue.get(keyStr) || 0;
    const now = Date.now();
    
    // 避免重複預取
    if (now - lastPrefetch < 1000 * 60) return;
    
    prefetchQueue.set(keyStr, now);
    
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 1000 * 60 * 5,
    });
  };
  
  return { prefetchData };
};

// 查詢去重優化
export const createDedupedQuery = (
  queryKey: any[],
  queryFn: () => Promise<any>,
  options: any = {}
) => {
  const keyStr = JSON.stringify(queryKey);
  const existingQuery = queryCache.get(keyStr);
  
  if (existingQuery && existingQuery.state.status === 'loading') {
    return existingQuery;
  }
  
  return {
    queryKey,
    queryFn: async () => {
      const startTime = performance.now();
      try {
        const result = await queryFn();
        const duration = performance.now() - startTime;
        
        performanceMonitor.recordMetric({
          name: 'query-duration',
          value: duration,
          timestamp: Date.now(),
          category: 'network',
          unit: 'ms',
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        performanceMonitor.recordMetric({
          name: 'query-error-duration',
          value: duration,
          timestamp: Date.now(),
          category: 'network',
          unit: 'ms',
        });
        
        throw error;
      }
    },
    ...options,
  };
};

// 簡單的查詢緩存
const queryCache = new Map<string, any>();

// 導出默認配置
export const defaultQueryConfig = {
  staleTime: 1000 * 60 * 5,
  gcTime: 1000 * 60 * 30,
  retry: 2,
  retryDelay: 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
};