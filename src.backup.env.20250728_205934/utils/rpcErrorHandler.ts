// src/utils/rpcErrorHandler.ts
// 🔧 統一的 RPC 錯誤處理工具

import { logger } from './logger';

/**
 * 常見的 RPC 錯誤類型
 */
export const RPC_ERROR_TYPES = {
  FILTER_NOT_FOUND: 'filter not found',
  CONNECTION_FAILED: 'connection failed',
  RATE_LIMIT: 'rate limit',
  TIMEOUT: 'timeout',
  NETWORK_ERROR: 'network error',
} as const;

/**
 * 檢查是否為可忽略的 RPC 錯誤
 */
export function isIgnorableRpcError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const message = 'message' in error ? String(error.message).toLowerCase() : '';
  
  // filter not found 是正常的，當 event filter 被清理時會發生
  if (message.includes(RPC_ERROR_TYPES.FILTER_NOT_FOUND)) {
    return true;
  }
  
  // 其他暫時性的網路錯誤也可以忽略
  const ignorablePatterns = [
    'network error',
    'timeout',
    'connection reset',
    'socket hang up',
    'enotfound',
  ];
  
  return ignorablePatterns.some(pattern => message.includes(pattern));
}

/**
 * 統一的事件監聽錯誤處理器
 */
export function createEventErrorHandler(eventName: string) {
  return (error: unknown) => {
    if (isIgnorableRpcError(error)) {
      // 可忽略的錯誤只記錄 debug 級別
      logger.debug(`Event ${eventName} - ignorable RPC error:`, error);
      return;
    }
    
    // 其他錯誤記錄為警告
    logger.warn(`Event ${eventName} - RPC error:`, error);
  };
}

/**
 * 建議的事件監聽配置
 */
export const RECOMMENDED_EVENT_CONFIG = {
  // 高優先級事件（用戶操作相關）
  high: {
    pollingInterval: 30_000, // 30 秒
    enabled: true,
  },
  
  // 中優先級事件（遊戲狀態更新）
  medium: {
    pollingInterval: 60_000, // 60 秒  
    enabled: true,
  },
  
  // 低優先級事件（統計、日誌等）
  low: {
    pollingInterval: 120_000, // 2 分鐘
    enabled: false, // 建議禁用，改用手動刷新
  },
  
  // 背景模式
  background: {
    pollingInterval: 300_000, // 5 分鐘
    enabled: false,
  },
} as const;

/**
 * 獲取基於用戶活動的事件配置
 */
export function getEventConfig(
  priority: keyof typeof RECOMMENDED_EVENT_CONFIG,
  isBackground: boolean = false
) {
  if (isBackground) {
    return RECOMMENDED_EVENT_CONFIG.background;
  }
  
  return RECOMMENDED_EVENT_CONFIG[priority];
}

/**
 * 創建帶有錯誤處理的事件監聽配置
 */
export function createEventWatchConfig(
  eventName: string,
  priority: keyof typeof RECOMMENDED_EVENT_CONFIG = 'medium',
  additionalConfig: Record<string, any> = {}
) {
  const config = getEventConfig(priority);
  
  return {
    ...additionalConfig,
    pollingInterval: config.pollingInterval,
    enabled: config.enabled && additionalConfig.enabled !== false,
    onError: createEventErrorHandler(eventName),
  };
}