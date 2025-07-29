// RPC 流量監控和性能分析工具

import { getCurrentRpcVersion, getRpcEndpoint } from './rpcOptimizedMigration';
import { logger } from './logger';

interface RpcMetrics {
  version: 'legacy' | 'optimized';
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
  startTime: number;
}

class RpcMonitor {
  private metrics: RpcMetrics;
  private readonly STORAGE_KEY = 'rpc-monitor-metrics';
  private readonly REPORT_INTERVAL = 60000; // 1分鐘報告一次
  private reportTimer?: NodeJS.Timeout;

  constructor() {
    this.metrics = this.loadMetrics();
    this.startPeriodicReporting();
  }

  // 載入存儲的指標
  private loadMetrics(): RpcMetrics {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 如果是新的一天，重置指標
        if (Date.now() - parsed.startTime > 24 * 60 * 60 * 1000) {
          return this.createFreshMetrics();
        }
        return parsed;
      }
    } catch (error) {
      console.warn('[RpcMonitor] Failed to load metrics:', error);
    }
    return this.createFreshMetrics();
  }

  // 創建新的指標對象
  private createFreshMetrics(): RpcMetrics {
    return {
      version: getCurrentRpcVersion(),
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      startTime: Date.now(),
    };
  }

  // 保存指標到本地存儲
  private saveMetrics(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('[RpcMonitor] Failed to save metrics:', error);
    }
  }

  // 記錄 RPC 請求
  recordRequest(
    success: boolean,
    responseTime: number,
    cacheHit: boolean = false,
    method?: string
  ): void {
    this.metrics.requestCount++;
    this.metrics.totalResponseTime += responseTime;

    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
    }

    if (cacheHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    // 更新版本（用戶可能切換群組）
    this.metrics.version = getCurrentRpcVersion();

    this.saveMetrics();

    // 在開發環境記錄詳細信息
    if (success) {
      logger.rpc(`${method || 'RPC'}: ${responseTime}ms, cache: ${cacheHit ? 'HIT' : 'MISS'}, version: ${this.metrics.version}`);
    } else {
      logger.rpcError(`${method || 'RPC'}: ${responseTime}ms FAILED, cache: ${cacheHit ? 'HIT' : 'MISS'}, version: ${this.metrics.version}`);
    }
  }

  // 獲取當前指標
  getMetrics(): RpcMetrics & {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    cacheHitRate: number;
    uptime: number;
  } {
    const { requestCount, successCount, errorCount, totalResponseTime, cacheHits, cacheMisses } = this.metrics;
    const totalCacheRequests = cacheHits + cacheMisses;

    return {
      ...this.metrics,
      averageResponseTime: requestCount > 0 ? Math.round(totalResponseTime / requestCount) : 0,
      successRate: requestCount > 0 ? (successCount / requestCount) * 100 : 0,
      errorRate: requestCount > 0 ? (errorCount / requestCount) * 100 : 0,
      cacheHitRate: totalCacheRequests > 0 ? (cacheHits / totalCacheRequests) * 100 : 0,
      uptime: Date.now() - this.metrics.startTime,
    };
  }

  // 重置指標
  resetMetrics(): void {
    this.metrics = this.createFreshMetrics();
    this.saveMetrics();
  }

  // 開始定期報告
  private startPeriodicReporting(): void {
    this.reportTimer = setInterval(() => {
      this.generateReport();
    }, this.REPORT_INTERVAL);
  }

  // 生成性能報告
  private generateReport(): void {
    const metrics = this.getMetrics();
    
    // 只在有請求活動時報告
    if (metrics.requestCount === 0) return;

    const report = {
      timestamp: new Date().toISOString(),
      version: metrics.version,
      performance: {
        requests: metrics.requestCount,
        successRate: `${metrics.successRate.toFixed(1)}%`,
        averageResponseTime: `${metrics.averageResponseTime}ms`,
        cacheHitRate: `${metrics.cacheHitRate.toFixed(1)}%`,
      },
      uptime: this.formatUptime(metrics.uptime),
    };

    // 發送到分析服務（如果配置了）
    this.sendToAnalytics(report);

    // 開發環境在控制台顯示
    if (import.meta.env.DEV) {
      console.group(`[RpcMonitor] Performance Report - ${metrics.version.toUpperCase()}`);
      console.table(report.performance);
      console.log(`Uptime: ${report.uptime}`);
      console.groupEnd();
    }
  }

  // 格式化運行時間
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // 發送到分析服務
  private sendToAnalytics(report: any): void {
    // 可以在這裡集成到 Google Analytics, Mixpanel 等
    // 或發送到自己的分析端點
    
    if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
      fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'rpc_performance_report',
          data: report,
        }),
      }).catch(() => {
        // 分析服務失敗不應該影響用戶體驗
      });
    }
  }

  // 清理資源
  destroy(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
  }
}

// 全局監控實例
export const rpcMonitor = new RpcMonitor();

// Hook for React components
export function useRpcMonitoring() {
  const metrics = rpcMonitor.getMetrics();

  return {
    metrics,
    resetMetrics: () => rpcMonitor.resetMetrics(),
    recordRequest: (success: boolean, responseTime: number, cacheHit?: boolean, method?: string) =>
      rpcMonitor.recordRequest(success, responseTime, cacheHit, method),
  };
}

// 包裝 fetch 以自動監控 RPC 請求
export function monitoredFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { method_name?: string }
): Promise<Response> {
  const startTime = Date.now();
  const methodName = init?.method_name || 'unknown';

  return fetch(input, init)
    .then((response) => {
      const responseTime = Date.now() - startTime;
      const cacheHit = response.headers.get('X-Cache') === 'HIT';
      
      rpcMonitor.recordRequest(
        response.ok,
        responseTime,
        cacheHit,
        methodName
      );

      return response;
    })
    .catch((error) => {
      const responseTime = Date.now() - startTime;
      rpcMonitor.recordRequest(false, responseTime, false, methodName);
      throw error;
    });
}

// 在頁面卸載時清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    rpcMonitor.destroy();
  });
}