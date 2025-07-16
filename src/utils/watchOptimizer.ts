// src/utils/watchOptimizer.ts - Watch 監聽優化器

import { logger } from './logger';
// import { rpcMonitor } from './rpcMonitor'; // Removed RPC monitoring

// 監聽配置接口
interface WatchConfig {
  enabled: boolean;
  pollingInterval: number;
  blockConfirmations: number;
  batchSize: number;
  syncConnectedChain: boolean;
}

// 優化的 watch 配置
export const OPTIMIZED_WATCH_CONFIG: WatchConfig = {
  enabled: false,                // 默認禁用自動監聽
  pollingInterval: 60000,        // 60秒輪詢間隔
  blockConfirmations: 2,         // 2個區塊確認
  batchSize: 10,                 // 批處理大小
  syncConnectedChain: false,     // 禁用鏈同步
};

// 管理員頁面專用 watch 配置
export const ADMIN_WATCH_CONFIG: WatchConfig = {
  enabled: false,                // 完全禁用
  pollingInterval: 0,            // 不輪詢
  blockConfirmations: 0,         // 不需要確認
  batchSize: 0,                  // 不批處理
  syncConnectedChain: false,     // 禁用鏈同步
};

// Watch 監聽器管理類
class WatchManager {
  private activeWatchers = new Map<string, any>();
  private watchConfig: WatchConfig = OPTIMIZED_WATCH_CONFIG;
  private isEnabled = false;

  // 設置 watch 配置
  setWatchConfig(config: Partial<WatchConfig>): void {
    this.watchConfig = { ...this.watchConfig, ...config };
    logger.info('Watch 配置已更新:', this.watchConfig);
  }

  // 啟用/禁用 watch
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (!enabled) {
      this.clearAllWatchers();
    }
    
    logger.info(`Watch 監聽已${enabled ? '啟用' : '禁用'}`);
  }

  // 註冊 watcher
  registerWatcher(
    key: string,
    watcher: any,
    options: {
      priority?: 'high' | 'medium' | 'low';
      autoStart?: boolean;
    } = {}
  ): void {
    if (!this.isEnabled) {
      logger.debug(`Watch 已禁用，跳過註冊: ${key}`);
      return;
    }

    // 清理現有的 watcher
    this.clearWatcher(key);

    // 註冊新的 watcher
    this.activeWatchers.set(key, {
      watcher,
      options,
      timestamp: Date.now(),
    });

    logger.debug(`註冊 watcher: ${key}`);
  }

  // 清理單個 watcher
  clearWatcher(key: string): void {
    const watcherData = this.activeWatchers.get(key);
    if (watcherData) {
      try {
        // 如果 watcher 有 unwatch 方法，調用它
        if (watcherData.watcher && typeof watcherData.watcher.unwatch === 'function') {
          watcherData.watcher.unwatch();
        }
      } catch (error) {
        logger.warn(`清理 watcher 失敗: ${key}`, error);
      }

      this.activeWatchers.delete(key);
      logger.debug(`清理 watcher: ${key}`);
    }
  }

  // 清理所有 watchers
  clearAllWatchers(): void {
    for (const [key] of this.activeWatchers.entries()) {
      this.clearWatcher(key);
    }
    logger.info('所有 watchers 已清理');
  }

  // 獲取活動的 watcher 數量
  getActiveWatcherCount(): number {
    return this.activeWatchers.size;
  }

  // 獲取 watcher 列表
  getWatcherList(): string[] {
    return Array.from(this.activeWatchers.keys());
  }

  // 獲取 watcher 統計
  getWatcherStats(): {
    total: number;
    byPriority: Record<string, number>;
    oldestTimestamp: number;
  } {
    const stats = {
      total: this.activeWatchers.size,
      byPriority: { high: 0, medium: 0, low: 0 },
      oldestTimestamp: Date.now(),
    };

    for (const [key, watcherData] of this.activeWatchers.entries()) {
      const priority = watcherData.options.priority || 'medium';
      stats.byPriority[priority]++;
      
      if (watcherData.timestamp < stats.oldestTimestamp) {
        stats.oldestTimestamp = watcherData.timestamp;
      }
    }

    return stats;
  }
}

// 事件過濾器優化器
class EventFilterOptimizer {
  private activeFilters = new Map<string, any>();
  private filterConfig = {
    maxFilters: 5,           // 最大過濾器數量
    batchSize: 100,          // 批處理大小
    timeoutMs: 30000,        // 超時時間
  };

  // 創建優化的事件過濾器
  createOptimizedFilter(
    key: string,
    filterOptions: any,
    options: {
      priority?: 'high' | 'medium' | 'low';
      timeout?: number;
    } = {}
  ): any {
    // 檢查是否超過最大過濾器數量
    if (this.activeFilters.size >= this.filterConfig.maxFilters) {
      logger.warn('事件過濾器數量已達上限，清理舊過濾器');
      this.cleanupOldFilters();
    }

    // 優化過濾器配置
    const optimizedOptions = {
      ...filterOptions,
      // 減少輪詢頻率
      pollingInterval: 30000,
      // 限制事件範圍
      fromBlock: 'latest',
      // 批處理配置
      batch: {
        size: this.filterConfig.batchSize,
        timeout: options.timeout || this.filterConfig.timeoutMs,
      },
    };

    // 創建過濾器
    const filter = {
      ...optimizedOptions,
      key,
      timestamp: Date.now(),
      priority: options.priority || 'medium',
    };

    this.activeFilters.set(key, filter);
    logger.debug(`創建優化的事件過濾器: ${key}`);

    return filter;
  }

  // 清理舊過濾器
  private cleanupOldFilters(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5分鐘

    for (const [key, filter] of this.activeFilters.entries()) {
      if (now - filter.timestamp > maxAge) {
        this.activeFilters.delete(key);
        logger.debug(`清理舊事件過濾器: ${key}`);
      }
    }
  }

  // 清理所有過濾器
  clearAllFilters(): void {
    this.activeFilters.clear();
    logger.info('所有事件過濾器已清理');
  }

  // 獲取過濾器統計
  getFilterStats(): {
    total: number;
    byPriority: Record<string, number>;
  } {
    const stats = {
      total: this.activeFilters.size,
      byPriority: { high: 0, medium: 0, low: 0 },
    };

    for (const [key, filter] of this.activeFilters.entries()) {
      stats.byPriority[filter.priority]++;
    }

    return stats;
  }
}

// 輪詢優化器
class PollingOptimizer {
  private pollingIntervals = new Map<string, NodeJS.Timeout>();
  private defaultConfig = {
    interval: 60000,          // 60秒
    maxConcurrent: 3,         // 最大並發數
    backoffMultiplier: 1.5,   // 退避倍數
  };

  // 創建優化的輪詢
  createOptimizedPolling(
    key: string,
    callback: () => Promise<any>,
    options: {
      interval?: number;
      maxRetries?: number;
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): void {
    // 清理現有輪詢
    this.clearPolling(key);

    const interval = options.interval || this.defaultConfig.interval;
    const priority = options.priority || 'medium';

    // 根據優先級調整間隔
    const adjustedInterval = this.adjustIntervalByPriority(interval, priority);

    // TEMP_DISABLED: 暫時禁用輪詢以避免 RPC 過載
    /*
    const pollingId = setInterval(async () => {
      try {
        const startTime = Date.now();
        await callback();
        const duration = Date.now() - startTime;
        
        // RPC monitoring disabled
        // rpcMonitor.completeRequest(
        //   `polling_${key}`,
        //   { success: true, duration },
        //   undefined
        // );

        if (duration > 5000) {
          logger.warn(`輪詢執行時間過長: ${key}, 耗時: ${duration}ms`);
        }
      } catch (error) {
        logger.error(`輪詢執行失敗: ${key}`, error);
        // RPC monitoring disabled
        // rpcMonitor.completeRequest(
        //   `polling_${key}`,
        //   undefined,
        //   error.message
        // );
      }
    }, adjustedInterval);
    */
    
    // 暫時返回一個模擬的 pollingId 來維持原有邏輯
    const pollingId = null;

    this.pollingIntervals.set(key, pollingId);
    logger.debug(`創建優化輪詢: ${key}, 間隔: ${adjustedInterval}ms`);
  }

  // 根據優先級調整間隔
  private adjustIntervalByPriority(interval: number, priority: string): number {
    switch (priority) {
      case 'high':
        return interval * 0.5;  // 高優先級減少間隔
      case 'low':
        return interval * 2;    // 低優先級增加間隔
      default:
        return interval;
    }
  }

  // 清理輪詢
  clearPolling(key: string): void {
    const pollingId = this.pollingIntervals.get(key);
    if (pollingId) {
      clearInterval(pollingId);
      this.pollingIntervals.delete(key);
      logger.debug(`清理輪詢: ${key}`);
    }
  }

  // 清理所有輪詢
  clearAllPolling(): void {
    for (const [key] of this.pollingIntervals.entries()) {
      this.clearPolling(key);
    }
    logger.info('所有輪詢已清理');
  }

  // 獲取輪詢統計
  getPollingStats(): {
    total: number;
    active: string[];
  } {
    return {
      total: this.pollingIntervals.size,
      active: Array.from(this.pollingIntervals.keys()),
    };
  }
}

// Watch 優化器主類
export class WatchOptimizer {
  private watchManager = new WatchManager();
  private eventFilterOptimizer = new EventFilterOptimizer();
  private pollingOptimizer = new PollingOptimizer();
  private isAdminMode = false;

  // 設置管理員模式
  setAdminMode(enabled: boolean): void {
    this.isAdminMode = enabled;
    
    if (enabled) {
      // 管理員模式：禁用所有 watch
      this.watchManager.setWatchConfig(ADMIN_WATCH_CONFIG);
      this.watchManager.setEnabled(false);
      this.cleanup();
      logger.info('🔧 管理員模式已啟用，所有 watch 監聽已禁用');
    } else {
      // 普通模式：啟用優化的 watch
      this.watchManager.setWatchConfig(OPTIMIZED_WATCH_CONFIG);
      this.watchManager.setEnabled(true);
      logger.info('🔧 普通模式已啟用，優化的 watch 監聽已啟用');
    }
  }

  // 創建優化的 useWatch 配置
  createOptimizedWatchConfig(baseConfig: any = {}): any {
    if (this.isAdminMode) {
      // 管理員模式：返回禁用的配置
      return {
        ...baseConfig,
        enabled: false,
        watch: false,
        pollingInterval: 0,
      };
    }

    // 普通模式：返回優化配置
    return {
      ...baseConfig,
      enabled: baseConfig.enabled !== false,
      watch: false,  // 禁用自動 watch
      pollingInterval: false,  // 禁用輪詢
      refetchInterval: false,  // 禁用自動刷新
    };
  }

  // 手動觸發數據刷新
  async triggerManualRefresh(
    key: string,
    refreshFn: () => Promise<any>,
    options: {
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<any> {
    const timeout = options.timeout || 10000;
    const retries = options.retries || 2;

    let lastError: any;
    
    for (let i = 0; i <= retries; i++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('刷新超時')), timeout);
        });

        const result = await Promise.race([
          refreshFn(),
          timeoutPromise,
        ]);

        logger.debug(`手動刷新成功: ${key}`);
        return result;
      } catch (error) {
        lastError = error;
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError;
  }

  // 獲取優化統計
  getOptimizationStats(): {
    watchManager: any;
    eventFilters: any;
    polling: any;
    isAdminMode: boolean;
  } {
    return {
      watchManager: this.watchManager.getWatcherStats(),
      eventFilters: this.eventFilterOptimizer.getFilterStats(),
      polling: this.pollingOptimizer.getPollingStats(),
      isAdminMode: this.isAdminMode,
    };
  }

  // 清理所有資源
  cleanup(): void {
    this.watchManager.clearAllWatchers();
    this.eventFilterOptimizer.clearAllFilters();
    this.pollingOptimizer.clearAllPolling();
    logger.info('Watch 優化器已清理');
  }
}

// 創建全局實例
export const watchOptimizer = new WatchOptimizer();

// 工具函數：為管理員頁面創建優化配置
export function createAdminOptimizedConfig(baseConfig: any = {}): any {
  return {
    ...baseConfig,
    // 禁用所有自動監聽
    watch: false,
    enabled: baseConfig.enabled !== false,
    
    // 禁用自動刷新
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    
    // 優化緩存
    staleTime: 1000 * 60 * 30,  // 30分鐘
    gcTime: 1000 * 60 * 90,     // 90分鐘
    
    // 減少重試
    retry: 1,
    retryDelay: 2000,
  };
}

// 工具函數：禁用 wagmi 的自動監聽
export function disableWagmiWatchers(): void {
  // 設置環境變量來禁用 wagmi 的自動監聽
  if (typeof window !== 'undefined') {
    (window as any).__WAGMI_DISABLE_WATCHERS__ = true;
  }
}

// 工具函數：減少 eth_newFilter 請求
export function optimizeEthFilters(): void {
  // 禁用不必要的事件監聽
  if (typeof window !== 'undefined') {
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type, listener, options) {
      // 過濾掉某些事件類型
      const blockedEvents = ['storage', 'online', 'offline'];
      if (blockedEvents.includes(type)) {
        logger.debug(`阻止事件監聽: ${type}`);
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  }
}

// 初始化管理員模式優化
export function initializeAdminOptimizations(): void {
  // 啟用管理員模式
  watchOptimizer.setAdminMode(true);
  
  // 禁用 wagmi watchers
  disableWagmiWatchers();
  
  // 優化 eth filters
  optimizeEthFilters();
  
  logger.info('🚀 管理員頁面優化已啟用');
}

// 清理管理員模式優化
export function cleanupAdminOptimizations(): void {
  watchOptimizer.setAdminMode(false);
  watchOptimizer.cleanup();
  
  logger.info('🧹 管理員頁面優化已清理');
}