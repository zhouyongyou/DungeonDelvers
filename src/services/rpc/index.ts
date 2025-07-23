// RPC 統一服務 - 整合所有 RPC 相關功能
// 避免重複的 RPC 監控、優化、錯誤處理邏輯

import { rpcMonitor } from '../../utils/rpcMonitor';
import { rpcOptimizer } from '../../utils/rpcOptimizer';
import { rpcErrorHandler } from '../../utils/rpcErrorHandler';
import { rpcHealthCheck } from '../../utils/rpcHealthCheck';
import { rpcAnalytics } from '../../utils/rpcAnalytics';
import { RequestDeduper } from '../../utils/rpcRequestDeduper';
import { ENV } from '../../config/env';

export class RPCService {
  private static instance: RPCService;
  private deduper: RequestDeduper;
  
  private constructor() {
    this.deduper = new RequestDeduper();
    this.initialize();
  }
  
  static getInstance(): RPCService {
    if (!RPCService.instance) {
      RPCService.instance = new RPCService();
    }
    return RPCService.instance;
  }
  
  private initialize() {
    // 初始化各個子系統
    console.log('[RPCService] Initializing unified RPC service');
    
    // 設置健康檢查
    this.setupHealthCheck();
    
    // 設置錯誤處理
    this.setupErrorHandling();
  }
  
  // =================================================================
  // 監控功能
  // =================================================================
  
  monitor = {
    start: () => rpcMonitor.startMonitoring?.() || console.warn('[RPCService] Monitor not available'),
    stop: () => rpcMonitor.stopMonitoring?.() || console.warn('[RPCService] Monitor not available'),
    getStats: () => rpcMonitor.getStats(),
    reset: () => rpcMonitor.reset(),
  };
  
  // =================================================================
  // 優化功能
  // =================================================================
  
  optimizer = {
    optimize: (config: any) => rpcOptimizer.optimize(config),
    getRecommendations: () => rpcOptimizer.getRecommendations(),
    applyBestPractices: () => rpcOptimizer.applyBestPractices(),
  };
  
  // =================================================================
  // 分析功能
  // =================================================================
  
  analytics = {
    analyze: () => rpcAnalytics.analyze(),
    getInsights: () => rpcAnalytics.getInsights(),
    exportData: () => rpcAnalytics.exportData(),
  };
  
  // =================================================================
  // 請求去重
  // =================================================================
  
  dedupe = {
    request: async <T>(key: string, fn: () => Promise<T>) => {
      return this.deduper.dedupe(key, fn);
    },
    clear: () => this.deduper.clear(),
  };
  
  // =================================================================
  // 健康檢查
  // =================================================================
  
  health = {
    check: async () => {
      const results = await rpcHealthCheck.checkAll();
      return {
        healthy: results.every(r => r.healthy),
        details: results,
        timestamp: Date.now(),
      };
    },
    
    checkEndpoint: async (url: string) => {
      return rpcHealthCheck.checkEndpoint(url);
    },
  };
  
  // =================================================================
  // 錯誤處理
  // =================================================================
  
  error = {
    handle: (error: any, context?: string) => {
      return rpcErrorHandler.handle(error, context);
    },
    
    getErrorStats: () => {
      return rpcErrorHandler.getStats();
    },
  };
  
  // =================================================================
  // 配置管理
  // =================================================================
  
  config = {
    getRPCUrl: (index: number = 0) => {
      // 優先使用 Alchemy，然後是公共 RPC
      const alchemyKey = ENV.RPC.ALCHEMY_KEYS[index % ENV.RPC.ALCHEMY_KEYS.length];
      if (alchemyKey) {
        return `https://bsc-mainnet.g.alchemy.com/v2/${alchemyKey}`;
      }
      return ENV.RPC.BSC_RPC;
    },
    
    getAllRPCUrls: () => {
      const urls: string[] = [];
      
      // 添加所有 Alchemy URL
      ENV.RPC.ALCHEMY_KEYS.forEach(key => {
        if (key) {
          urls.push(`https://bsc-mainnet.g.alchemy.com/v2/${key}`);
        }
      });
      
      // 添加公共 RPC
      urls.push(ENV.RPC.BSC_RPC);
      
      return urls;
    },
  };
  
  // =================================================================
  // 私有方法
  // =================================================================
  
  private setupHealthCheck() {
    // 每 5 分鐘檢查一次 RPC 健康狀態
    setInterval(async () => {
      const health = await this.health.check();
      if (!health.healthy) {
        console.warn('[RPCService] RPC health check failed:', health);
      }
    }, 5 * 60 * 1000);
  }
  
  private setupErrorHandling() {
    // 設置全局錯誤處理
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        if (event.reason?.message?.includes('RPC')) {
          this.error.handle(event.reason, 'unhandledrejection');
        }
      });
    }
  }
}

// 導出單例
export const rpcService = RPCService.getInstance();

// 導出便捷方法
export const getRPCUrl = (index?: number) => rpcService.config.getRPCUrl(index);
export const monitorRPC = () => rpcService.monitor;
export const optimizeRPC = () => rpcService.optimizer;
export const analyzeRPC = () => rpcService.analytics;