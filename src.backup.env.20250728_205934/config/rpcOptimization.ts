// src/config/rpcOptimization.ts - RPC 優化配置

/**
 * RPC 請求優化配置
 * 用於減少不必要的 RPC 請求並提升性能
 */

// 查詢快取時間配置（毫秒）
export const QUERY_STALE_TIMES = {
  // 合約設定類 - 很少變更
  contractSettings: 1000 * 60 * 30,     // 30分鐘
  adminSettings: 1000 * 60 * 20,        // 20分鐘
  contractParameters: 1000 * 60 * 15,   // 15分鐘
  
  // NFT 數據類 - 中等變更頻率
  nftMetadata: 1000 * 60 * 60,         // 60分鐘
  nftBalance: 1000 * 60 * 5,           // 5分鐘
  nftList: 1000 * 60 * 2,              // 2分鐘
  
  // 用戶數據類 - 較高變更頻率
  userProfile: 1000 * 60 * 2,           // 2分鐘
  userBalance: 1000 * 60,               // 1分鐘
  vaultBalance: 1000 * 60,              // 1分鐘
  
  // 遊戲狀態類 - 高變更頻率
  partyStatus: 1000 * 30,               // 30秒
  expeditionResult: 1000 * 10,          // 10秒
  
  // 價格數據類
  tokenPrice: 1000 * 60 * 5,            // 5分鐘
  mintPrice: 1000 * 60 * 10,            // 10分鐘
} as const;

// 垃圾回收時間配置（毫秒）- 通常是 staleTime 的 2-3 倍
export const QUERY_GC_TIMES = {
  contractSettings: 1000 * 60 * 90,     // 90分鐘
  adminSettings: 1000 * 60 * 60,        // 60分鐘
  contractParameters: 1000 * 60 * 45,   // 45分鐘
  
  nftMetadata: 1000 * 60 * 180,        // 3小時
  nftBalance: 1000 * 60 * 15,          // 15分鐘
  nftList: 1000 * 60 * 6,              // 6分鐘
  
  userProfile: 1000 * 60 * 6,          // 6分鐘
  userBalance: 1000 * 60 * 3,          // 3分鐘
  vaultBalance: 1000 * 60 * 3,         // 3分鐘
  
  partyStatus: 1000 * 90,              // 90秒
  expeditionResult: 1000 * 30,         // 30秒
  
  tokenPrice: 1000 * 60 * 15,          // 15分鐘
  mintPrice: 1000 * 60 * 30,           // 30分鐘
} as const;

// 事件輪詢間隔配置（毫秒）
export const EVENT_POLLING_INTERVALS = {
  // 基於用戶活動狀態
  active: 30_000,      // 用戶活躍時：30秒
  idle: 60_000,        // 用戶閒置時：60秒
  background: 300_000, // 頁面背景時：5分鐘
  
  // 特定事件類型的自定義間隔
  critical: 10_000,    // 關鍵事件（如交易狀態）：10秒
  important: 30_000,   // 重要事件（如餘額更新）：30秒
  normal: 60_000,      // 一般事件（如 NFT 變更）：60秒
  low: 300_000,        // 低優先級事件：5分鐘
} as const;

// React Query 默認配置
export const DEFAULT_QUERY_OPTIONS = {
  refetchOnWindowFocus: false,  // 禁用窗口聚焦時重新獲取
  refetchOnMount: false,        // 禁用組件掛載時重新獲取
  refetchOnReconnect: true,     // 網絡重連時重新獲取
  retry: 2,                     // 最多重試 2 次
  retryDelay: 1000,            // 重試延遲 1 秒
} as const;

// 批量請求配置
export const BATCH_REQUEST_CONFIG = {
  maxBatchSize: 10,             // 最大批量大小
  batchDelayMs: 50,             // 批量延遲（毫秒）
  maxConcurrentRequests: 3,     // 最大並發請求數
} as const;

// 請求去重配置
export const DEDUP_CONFIG = {
  windowMs: 1000,               // 去重窗口時間（毫秒）
  maxRequests: 1,               // 窗口內最大請求數
} as const;

// 根據查詢類型獲取優化配置
export function getOptimizedQueryConfig(queryType: keyof typeof QUERY_STALE_TIMES) {
  return {
    ...DEFAULT_QUERY_OPTIONS,
    staleTime: QUERY_STALE_TIMES[queryType],
    gcTime: QUERY_GC_TIMES[queryType],
  };
}

// 判斷是否應該啟用查詢
export function shouldEnableQuery(
  condition: boolean = true,
  userActivity: 'active' | 'idle' | 'background' = 'active'
): boolean {
  // 背景模式下禁用大部分查詢
  if (userActivity === 'background') {
    return false;
  }
  
  return condition;
}

// 獲取動態輪詢間隔
export function getDynamicPollingInterval(
  priority: 'critical' | 'important' | 'normal' | 'low',
  userActivity: 'active' | 'idle' | 'background'
): number {
  // 背景模式下使用最長間隔
  if (userActivity === 'background') {
    return EVENT_POLLING_INTERVALS.background;
  }
  
  // 根據優先級和用戶活動狀態返回間隔
  const baseInterval = EVENT_POLLING_INTERVALS[priority];
  const activityMultiplier = userActivity === 'idle' ? 2 : 1;
  
  return baseInterval * activityMultiplier;
}