// src/utils/rpcMonitorFix.ts - RPC 監控修復工具

// import { rpcMonitor } from './rpcMonitor'; // Removed RPC monitoring
import { logger } from './logger';

/**
 * RPC 監控診斷工具
 * 用於識別和修復監控系統的問題
 */
export class RpcMonitorDiagnostics {
  private realRequestCount = 0;
  private monitoredRequestCount = 0;
  private interceptedRequests: Map<string, { url: string; method: string; timestamp: number }> = new Map();

  /**
   * 攔截實際的 fetch 請求以計算真實的 RPC 請求數
   */
  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const [resource, config] = args;
      
      // 檢查是否是 RPC 請求
      if (typeof resource === 'string' && (resource.includes('/api/rpc') || resource.includes('alchemy.com'))) {
        this.realRequestCount++;
        
        // 解析請求內容
        if (config?.body) {
          try {
            const body = JSON.parse(config.body as string);
            const requestId = `${body.method}_${Date.now()}`;
            this.interceptedRequests.set(requestId, {
              url: resource,
              method: body.method,
              timestamp: Date.now(),
            });
            
            logger.debug('🔍 實際 RPC 請求:', {
              url: resource,
              method: body.method,
              realCount: this.realRequestCount,
            });
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }
      
      // 調用原始 fetch
      return originalFetch.apply(window, args);
    };
  }

  /**
   * 開始診斷
   */
  startDiagnostics() {
    this.interceptFetch();
    
    // RPC monitoring disabled
    setInterval(() => {
      // const stats = rpcMonitor.getStats();
      this.monitoredRequestCount = 0;
      
      // 比較差異
      const discrepancy = this.monitoredRequestCount - this.realRequestCount;
      if (discrepancy > 10) {
        logger.warn('⚠️ RPC 監控統計不準確:', {
          monitored: this.monitoredRequestCount,
          real: this.realRequestCount,
          difference: discrepancy,
          possibleCause: '可能在計算本地緩存查詢或重複計算',
        });
      }
    }, 5000);
  }

  /**
   * 獲取診斷報告
   */
  getDiagnosticsReport() {
    // RPC monitoring disabled
    const stats = { totalRequests: 0, successfulRequests: 0, failedRequests: 0, averageResponseTime: 0, requestsByMethod: {} };
    const recentRequests = Array.from(this.interceptedRequests.values()).slice(-20);
    
    return {
      summary: {
        monitoredRequests: this.monitoredRequestCount,
        realRequests: this.realRequestCount,
        discrepancy: this.monitoredRequestCount - this.realRequestCount,
        accuracy: this.realRequestCount > 0 
          ? ((this.realRequestCount / this.monitoredRequestCount) * 100).toFixed(2) + '%'
          : 'N/A',
      },
      monitorStats: {
        total: stats.totalRequests,
        successful: stats.successfulRequests,
        failed: stats.failedRequests,
        averageResponseTime: stats.averageResponseTime,
        byMethod: stats.requestsByMethod,
        byContract: stats.requestsByContract,
      },
      recentRealRequests: recentRequests,
      recommendations: this.getRecommendations(),
    };
  }

  /**
   * 獲取優化建議
   */
  private getRecommendations(): string[] {
    const recommendations: string[] = [];
    const discrepancy = this.monitoredRequestCount - this.realRequestCount;
    
    if (discrepancy > 50) {
      recommendations.push('監控系統可能在重複計算請求，建議檢查 useEffect 依賴');
    }
    
    if (this.realRequestCount < 10 && this.monitoredRequestCount > 100) {
      recommendations.push('大部分請求可能來自本地緩存，這是正常的優化行為');
    }
    
    if (this.interceptedRequests.size > 0) {
      const methods = Array.from(this.interceptedRequests.values())
        .map(r => r.method);
      const methodCounts = methods.reduce((acc, method) => {
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topMethod = Object.entries(methodCounts)
        .sort(([, a], [, b]) => b - a)[0];
      
      if (topMethod && topMethod[1] > this.realRequestCount * 0.5) {
        recommendations.push(`${topMethod[0]} 方法佔用了超過 50% 的請求，考慮優化`);
      }
    }
    
    return recommendations;
  }

  /**
   * 重置診斷數據
   */
  reset() {
    this.realRequestCount = 0;
    this.monitoredRequestCount = 0;
    this.interceptedRequests.clear();
    // RPC monitoring disabled
    // rpcMonitor.clearStats();
  }
}

// 創建全局診斷實例
export const rpcDiagnostics = new RpcMonitorDiagnostics();

// 開發環境下自動啟動診斷
if (import.meta.env.DEV) {
  // 延遲啟動以確保應用已初始化
  setTimeout(() => {
    rpcDiagnostics.startDiagnostics();
    logger.info('🔧 RPC 診斷工具已啟動');
    
    // 每分鐘輸出診斷報告
    setInterval(() => {
      const report = rpcDiagnostics.getDiagnosticsReport();
      logger.info('📊 RPC 診斷報告:', report);
    }, 60000);
  }, 5000);
}