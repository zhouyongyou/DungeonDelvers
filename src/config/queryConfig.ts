import { UseQueryOptions } from '@tanstack/react-query';

// 查詢類型定義
export type QueryCategory = 'NFT' | 'CONTRACT' | 'GRAPHQL' | 'METADATA';

// 查詢配置映射
const queryConfigs: Record<QueryCategory, Partial<UseQueryOptions>> = {
  NFT: {
    staleTime: 1000 * 60 * 30,        // 30 分鐘內視為新鮮
    gcTime: 1000 * 60 * 60 * 2,       // 2 小時垃圾回收
    refetchOnWindowFocus: false,       // 視窗聚焦時不重新獲取
    refetchOnMount: false,             // 組件掛載時不重新獲取
    refetchOnReconnect: 'always',      // 重新連接時總是重新獲取
    retry: 3,                          // 重試 3 次
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  },
  CONTRACT: {
    staleTime: 1000 * 10,              // 10 秒內視為新鮮
    gcTime: 1000 * 60 * 5,             // 5 分鐘垃圾回收
    refetchOnWindowFocus: true,        // 視窗聚焦時重新獲取
    refetchOnMount: true,              // 組件掛載時重新獲取
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: 2,                          // 重試 2 次
    retryDelay: 1000,                  // 固定 1 秒延遲
  },
  GRAPHQL: {
    staleTime: 1000 * 60 * 5,          // 5 分鐘內視為新鮮
    gcTime: 1000 * 60 * 30,            // 30 分鐘垃圾回收
    refetchOnWindowFocus: false,       // 視窗聚焦時不重新獲取
    refetchOnMount: 'always',          // 組件掛載時總是檢查
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: 3,                          // 重試 3 次
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  },
  METADATA: {
    staleTime: 1000 * 60 * 60 * 24,    // 24 小時內視為新鮮
    gcTime: 1000 * 60 * 60 * 24 * 7,   // 7 天垃圾回收
    refetchOnWindowFocus: false,       // 視窗聚焦時不重新獲取
    refetchOnMount: false,             // 組件掛載時不重新獲取
    refetchOnReconnect: false,         // 重新連接時不重新獲取
    retry: 1,                          // 只重試 1 次
    retryDelay: 500,                   // 固定 500ms 延遲
  },
};

// 獲取查詢配置
export function getQueryConfig(category: QueryCategory): Partial<UseQueryOptions> {
  return queryConfigs[category];
}

// 合併查詢配置
export function mergeQueryConfig(
  category: QueryCategory,
  customConfig: Partial<UseQueryOptions>
): Partial<UseQueryOptions> {
  return {
    ...queryConfigs[category],
    ...customConfig,
  };
}

// 預設錯誤處理
export const defaultQueryErrorHandler = (error: unknown) => {
  console.error('Query error:', error);
  // 可以在這裡添加全局錯誤處理邏輯
};

// 查詢鍵生成器
export const queryKeys = {
  // NFT 相關
  ownedNfts: (address?: string, chainId?: number) => ['ownedNfts', address, chainId],
  nftMetadata: (tokenId: string, contractAddress: string) => ['nftMetadata', tokenId, contractAddress],
  
  // Player 相關
  playerData: (address: string, fields?: string[]) => ['playerData', address, fields],
  playerStats: (address: string) => ['playerStats', address],
  playerParties: (address: string) => ['playerParties', address],
  
  // 合約相關
  contractRead: (contractName: string, functionName: string, args?: unknown[]) => 
    ['contractRead', contractName, functionName, args],
  
  // GraphQL 相關
  graphql: (query: string, variables?: Record<string, unknown>) => 
    ['graphql', query, variables],
} as const;

// 查詢失效策略
export const invalidationStrategies = {
  // 當創建新隊伍時
  onPartyCreated: (queryClient: any, address: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ownedNfts(address) });
    queryClient.invalidateQueries({ queryKey: queryKeys.playerParties(address) });
    queryClient.invalidateQueries({ queryKey: queryKeys.playerStats(address) });
  },
  
  // 當鑄造新 NFT 時
  onNftMinted: (queryClient: any, address: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ownedNfts(address) });
    queryClient.invalidateQueries({ queryKey: queryKeys.playerStats(address) });
  },
  
  // 當質押/解除質押時
  onStakeChanged: (queryClient: any, address: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.playerData(address) });
  },
} as const;