// src/config/watchConfig.ts - 智能 Watch 配置

import { logger } from '../utils/logger';

// Watch 配置類型
interface WatchConfig {
  enabled: boolean;
  pollingInterval: number;
  maxWatchers: number;
  priority: 'high' | 'medium' | 'low';
}

// 不同頁面的 Watch 配置
export const WATCH_CONFIGS: Record<string, WatchConfig> = {
  // 管理員頁面 - 完全禁用
  admin: {
    enabled: false,
    pollingInterval: 0,
    maxWatchers: 0,
    priority: 'low',
  },
  
  // 儀表板 - 中等頻率
  dashboard: {
    enabled: true,
    pollingInterval: 30000, // 30秒
    maxWatchers: 5,
    priority: 'high',
  },
  
  // 遊戲頁面 - 高頻率
  dungeon: {
    enabled: true,
    pollingInterval: 15000, // 15秒
    maxWatchers: 8,
    priority: 'high',
  },
  
  // 鑄造頁面 - 中等頻率
  mint: {
    enabled: true,
    pollingInterval: 20000, // 20秒
    maxWatchers: 3,
    priority: 'medium',
  },
  
  // 資產頁面 - 低頻率
  party: {
    enabled: true,
    pollingInterval: 45000, // 45秒
    maxWatchers: 5,
    priority: 'medium',
  },
  
  // 其他頁面 - 默認配置
  default: {
    enabled: true,
    pollingInterval: 60000, // 60秒
    maxWatchers: 3,
    priority: 'low',
  },
};

// 獲取當前頁面的 Watch 配置
export function getCurrentWatchConfig(): WatchConfig {
  const currentPage = getCurrentPageName();
  const config = WATCH_CONFIGS[currentPage] || WATCH_CONFIGS.default;
  
  // logger.debug(`🔍 當前頁面 Watch 配置: ${currentPage}`, config);
  
  return config;
}

// 獲取當前頁面名稱
function getCurrentPageName(): string {
  if (typeof window === 'undefined') return 'default';
  
  const hash = window.location.hash;
  if (hash.includes('admin')) return 'admin';
  if (hash.includes('dashboard')) return 'dashboard';
  if (hash.includes('dungeon')) return 'dungeon';
  if (hash.includes('mint')) return 'mint';
  if (hash.includes('party')) return 'party';
  if (hash.includes('explorer')) return 'explorer';
  if (hash.includes('altar')) return 'altar';
  if (hash.includes('profile')) return 'profile';
  if (hash.includes('vip')) return 'vip';
  if (hash.includes('referral')) return 'referral';
  if (hash.includes('codex')) return 'codex';
  
  return 'default';
}

// 檢查是否應該啟用 Watch
export function shouldEnableWatch(functionName?: string): boolean {
  const config = getCurrentWatchConfig();
  
  if (!config.enabled) return false;
  
  // 某些特定函數不需要 Watch
  const noWatchFunctions = [
    'owner',
    'name',
    'symbol',
    'decimals',
    'totalSupply',
    'paused',
    'version',
    'twapPeriod',
    'oracleAddress',
    'mintPriceUSD',
    'platformFee',
    'commissionRate',
    'globalRewardMultiplier',
    'unstakeCooldown',
    'explorationFee',
    'provisionPriceUSD',
    'restCostPowerDivisor',
  ];
  
  if (functionName && noWatchFunctions.includes(functionName)) {
    return false;
  }
  
  return true;
}

// 獲取優化的查詢配置
export function getOptimizedQueryConfig(baseConfig: any = {}): any {
  const watchConfig = getCurrentWatchConfig();
  
  return {
    ...baseConfig,
    // Watch 配置
    watch: shouldEnableWatch(baseConfig.functionName),
    
    // 查詢配置
    query: {
      ...baseConfig.query,
      // 輪詢間隔
      refetchInterval: watchConfig.enabled ? watchConfig.pollingInterval : false,
      
      // 緩存配置
      staleTime: watchConfig.enabled ? watchConfig.pollingInterval / 2 : 1000 * 60 * 30,
      gcTime: watchConfig.enabled ? watchConfig.pollingInterval * 2 : 1000 * 60 * 60,
      
      // 自動刷新配置
      refetchOnWindowFocus: watchConfig.enabled && watchConfig.priority === 'high',
      refetchOnMount: true,
      refetchOnReconnect: watchConfig.enabled,
      
      // 錯誤處理
      retry: watchConfig.enabled ? 2 : 2,  // 即使 watch 禁用也允許 2 次重試
      retryDelay: watchConfig.enabled ? 1000 : 2000,
    },
  };
}

// Watch 監聽器管理
class WatchManager {
  private activeWatchers = new Set<string>();
  
  // 註冊 Watcher
  registerWatcher(key: string): boolean {
    const config = getCurrentWatchConfig();
    
    if (!config.enabled) {
      // logger.debug(`Watch 已禁用，跳過註冊: ${key}`);
      return false;
    }
    
    if (this.activeWatchers.size >= config.maxWatchers) {
      // logger.warn(`Watch 數量已達上限 (${config.maxWatchers})，跳過註冊: ${key}`);
      return false;
    }
    
    this.activeWatchers.add(key);
    // logger.debug(`註冊 Watch: ${key} (${this.activeWatchers.size}/${config.maxWatchers})`);
    return true;
  }
  
  // 移除 Watcher
  unregisterWatcher(key: string): void {
    this.activeWatchers.delete(key);
    // logger.debug(`移除 Watch: ${key} (${this.activeWatchers.size})`);
  }
  
  // 獲取活動 Watcher 數量
  getActiveWatcherCount(): number {
    return this.activeWatchers.size;
  }
  
  // 清理所有 Watcher
  clearAll(): void {
    this.activeWatchers.clear();
    logger.info('所有 Watch 已清理');
  }
}

// 創建全局 Watch 管理器
export const watchManager = new WatchManager();

// 工具函數：檢查是否為管理員頁面
export function isAdminPage(): boolean {
  return getCurrentPageName() === 'admin';
}

// 工具函數：獲取推薦的輪詢間隔
export function getRecommendedPollingInterval(): number {
  const config = getCurrentWatchConfig();
  return config.pollingInterval;
}