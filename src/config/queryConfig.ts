import type { UseQueryOptions } from '@tanstack/react-query';

// 查詢類型定義
export type QueryCategory = 'NFT' | 'CONTRACT' | 'GRAPHQL' | 'METADATA' | 'ADMIN' | 'ADMIN_PARAMS' | 'TAX_SYSTEM' | 'PRICE' | 'PLATFORM_FEE' | 'BALANCE' | 'APPROVAL' | 'GAME_DATA';

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
    staleTime: 1000 * 30,              // 30 秒內視為新鮮（增加以減少請求）
    gcTime: 1000 * 60 * 10,            // 10 分鐘垃圾回收（延長緩存）
    refetchOnWindowFocus: false,       // 視窗聚焦時不重新獲取（減少請求）
    refetchOnMount: 'always',          // 組件掛載時檢查是否需要
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: (failureCount, error) => {
      // 429 錯誤只重試一次
      if (error?.code === -32005 || error?.code === 429 || error?.message?.includes('rate limit')) {
        return failureCount < 1;
      }
      // 其他錯誤重試 2 次
      return failureCount < 2;
    },
    retryDelay: (attemptIndex, error) => {
      // 429 錯誤使用更長延遲
      if (error?.code === -32005 || error?.code === 429) {
        return Math.min(3000 * 2 ** attemptIndex, 10000);
      }
      return 1000;
    },
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
  // 管理員配置（管理員頁面的合約設定）
  ADMIN: {
    staleTime: 1000 * 60 * 10,         // 10分鐘 - 但會在修改後立即 invalidate
    gcTime: 1000 * 60 * 30,            // 30分鐘
    refetchOnWindowFocus: false,       // 避免切換視窗時重新請求
    refetchOnMount: false,             // 避免重複載入時重新請求
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: 2,                          // 減少重試次數
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  },
  // 管理員參數配置（數值參數設定）
  ADMIN_PARAMS: {
    staleTime: 1000 * 60 * 15,         // 15分鐘 - 但會在修改後立即 invalidate
    gcTime: 1000 * 60 * 45,            // 45分鐘
    refetchOnWindowFocus: false,       // 避免切換視窗時重新請求
    refetchOnMount: false,             // 避免重複載入時重新請求
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: 2,                          // 減少重試次數
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  },
  // 稅務系統配置（稅務參數很少變更）
  TAX_SYSTEM: {
    staleTime: 1000 * 60 * 20,         // 20分鐘 - 但會在修改後立即 invalidate
    gcTime: 1000 * 60 * 60,            // 60分鐘
    refetchOnWindowFocus: false,       // 避免切換視窗時重新請求
    refetchOnMount: false,             // 避免重複載入時重新請求
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: 2,                          // 減少重試次數
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  },
  // 價格配置（價格可能有變動）
  PRICE: {
    staleTime: 1000 * 60 * 5,          // 5分鐘 - 但會在修改後立即 invalidate
    gcTime: 1000 * 60 * 15,            // 15分鐘
    refetchOnWindowFocus: false,       // 避免切換視窗時重新請求
    refetchOnMount: false,             // 避免重複載入時重新請求
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: 2,                          // 減少重試次數
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  },
  // 平台費用配置（平台費用變更頻率很低）
  PLATFORM_FEE: {
    staleTime: 1000 * 60 * 30,         // 30分鐘 - 但會在修改後立即 invalidate
    gcTime: 1000 * 60 * 60,            // 60分鐘
    refetchOnWindowFocus: false,       // 避免切換視窗時重新請求
    refetchOnMount: false,             // 避免重複載入時重新請求
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: 2,                          // 減少重試次數
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  },
  // 餘額配置（餘額需要較新的數據）
  BALANCE: {
    staleTime: 1000 * 60 * 2,          // 2分鐘 - 交易後會立即 invalidate
    gcTime: 1000 * 60 * 10,            // 10分鐘
    refetchOnWindowFocus: false,       // 避免切換視窗時重新請求
    refetchOnMount: false,             // 避免重複載入時重新請求
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: 2,                          // 減少重試次數
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  },
  // 授權配置（授權狀態需要較新）
  APPROVAL: {
    staleTime: 1000 * 60 * 5,          // 5分鐘 - 授權操作後會立即 invalidate
    gcTime: 1000 * 60 * 15,            // 15分鐘
    refetchOnWindowFocus: false,       // 避免切換視窗時重新請求
    refetchOnMount: false,             // 避免重複載入時重新請求
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: 2,                          // 減少重試次數
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  },
  // 遊戲數據配置（遊戲相關數據）
  GAME_DATA: {
    staleTime: 1000 * 30,              // 30秒 - 遊戲操作後會立即 invalidate
    gcTime: 1000 * 60 * 5,             // 5分鐘
    refetchOnWindowFocus: false,       // 避免切換視窗時重新請求
    refetchOnMount: false,             // 避免重複載入時重新請求
    refetchOnReconnect: true,          // 重新連接時重新獲取
    retry: 2,                          // 減少重試次數
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
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
  
  // 🔄 管理員操作後的快取失效策略
  
  // 當管理員修改合約設定時
  onAdminContractConfigChanged: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: ['admin-contracts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    queryClient.invalidateQueries({ queryKey: ['contract-addresses'] });
  },
  
  // 當管理員修改參數時
  onAdminParameterChanged: (queryClient: any, parameterType?: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin-parameters'] });
    queryClient.invalidateQueries({ queryKey: ['admin-params'] });
    // 如果是價格相關參數，也要失效價格快取
    if (parameterType?.includes('price') || parameterType?.includes('Price')) {
      queryClient.invalidateQueries({ queryKey: ['price-data'] });
      queryClient.invalidateQueries({ queryKey: ['mint-prices'] });
    }
    // 如果是費用相關參數，也要失效費用快取
    if (parameterType?.includes('fee') || parameterType?.includes('Fee')) {
      queryClient.invalidateQueries({ queryKey: ['platform-fees'] });
    }
  },
  
  // 當管理員修改稅務參數時
  onAdminTaxParameterChanged: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: ['tax-system'] });
    queryClient.invalidateQueries({ queryKey: ['tax-params'] });
    queryClient.invalidateQueries({ queryKey: ['vault-params'] });
  },
  
  // 當管理員修改平台費用時
  onAdminPlatformFeeChanged: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: ['platform-fees'] });
    queryClient.invalidateQueries({ queryKey: ['admin-parameters'] });
  },
  
  // 當管理員修改遊戲配置時
  onAdminGameConfigChanged: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: ['game-config'] });
    queryClient.invalidateQueries({ queryKey: ['admin-parameters'] });
    queryClient.invalidateQueries({ queryKey: ['dungeon-config'] });
    queryClient.invalidateQueries({ queryKey: ['altar-rules'] });
    queryClient.invalidateQueries({ queryKey: ['vip-settings'] });
  },
  
  // 當管理員暫停/恢復合約時
  onAdminContractPauseChanged: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: ['contract-status'] });
    queryClient.invalidateQueries({ queryKey: ['admin-contracts'] });
  },
  
  // 當管理員提取資金時
  onAdminFundsWithdrawn: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: ['contract-balances'] });
    queryClient.invalidateQueries({ queryKey: ['admin-funds'] });
  },
  
  // 通用管理員操作失效策略
  onAdminOperationCompleted: (queryClient: any) => {
    // 失效所有管理員相關的快取
    queryClient.invalidateQueries({ queryKey: ['admin'] });
    queryClient.invalidateQueries({ queryKey: ['admin-contracts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-parameters'] });
    queryClient.invalidateQueries({ queryKey: ['admin-params'] });
    queryClient.invalidateQueries({ queryKey: ['tax-system'] });
    queryClient.invalidateQueries({ queryKey: ['platform-fees'] });
    queryClient.invalidateQueries({ queryKey: ['game-config'] });
  },
} as const;