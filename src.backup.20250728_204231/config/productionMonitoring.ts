// src/config/productionMonitoring.ts - 生產環境 RPC 監控配置

// import { rpcMonitor } from '../utils/rpcMonitor'; // Removed RPC monitoring
// import { rpcAnalytics } from '../utils/rpcAnalytics'; // Removed RPC monitoring
import { logger } from '../utils/logger';

// 生產環境監控配置
interface ProductionMonitoringConfig {
  enableMonitoring: boolean;
  enableAnalytics: boolean;
  enableAutoReporting: boolean;
  reportingInterval: number;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    requestsPerMinute: number;
  };
}

// 獲取生產環境配置
export function getProductionMonitoringConfig(): ProductionMonitoringConfig {
  const isProduction = import.meta.env.PROD;
  
  return {
    enableMonitoring: true, // 生產環境始終啟用
    enableAnalytics: isProduction,
    enableAutoReporting: isProduction,
    reportingInterval: 1000 * 60 * 15, // 15分鐘
    alertThresholds: {
      errorRate: 0.05, // 5% 錯誤率
      responseTime: 3000, // 3秒響應時間
      requestsPerMinute: 1000, // 每分鐘1000請求
    },
  };
}

// 生產環境監控報告
export interface ProductionReport {
  timestamp: number;
  environment: string;
  rpcUsage: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    peakResponseTime: number;
    errorCount: number;
    costEstimate: number;
  };
  topEndpoints: Array<{
    method: string;
    count: number;
    averageTime: number;
  }>;
  topPages: Array<{
    page: string;
    requestCount: number;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

// 生成生產環境報告 - RPC monitoring disabled
export async function generateProductionReport(): Promise<ProductionReport> {
  // RPC monitoring disabled - return mock data
  const stats = { totalRequests: 0, failedRequests: 0, successfulRequests: 0, averageResponseTime: 0, requestsByMethod: {}, requestsByContract: {} };
  const insights = [];
  const analyticsReport = { disabled: true };
  
  // 估算成本（基於 Alchemy 定價）
  const costEstimate = calculateRpcCost(stats.totalRequests);
  
  // 生成警報
  const alerts: ProductionReport['alerts'] = [];
  const config = getProductionMonitoringConfig();
  
  // 檢查錯誤率
  const errorRate = stats.failedRequests / stats.totalRequests;
  if (errorRate > config.alertThresholds.errorRate) {
    alerts.push({
      type: 'error_rate',
      message: `錯誤率過高: ${(errorRate * 100).toFixed(1)}%`,
      severity: 'high',
    });
  }
  
  // 檢查響應時間
  if (stats.averageResponseTime > config.alertThresholds.responseTime) {
    alerts.push({
      type: 'response_time',
      message: `平均響應時間過長: ${stats.averageResponseTime.toFixed(0)}ms`,
      severity: 'medium',
    });
  }
  
  // 整理頂級端點
  const topEndpoints = Object.entries(stats.requestsByMethod)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([method, count]) => ({
      method,
      count,
      averageTime: stats.averageResponseTime, // 簡化版本
    }));
  
  // 整理頂級頁面
  const topPages = Object.entries(stats.requestsByPage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([page, requestCount]) => ({
      page,
      requestCount,
    }));
  
  return {
    timestamp: Date.now(),
    environment: import.meta.env.MODE,
    rpcUsage: {
      totalRequests: stats.totalRequests,
      successRate: stats.totalRequests > 0 ? stats.successfulRequests / stats.totalRequests : 0,
      averageResponseTime: stats.averageResponseTime,
      peakResponseTime: Math.max(...analyticsReport.performance.slowestRequests.map(r => r.duration || 0)),
      errorCount: stats.failedRequests,
      costEstimate,
    },
    topEndpoints,
    topPages,
    alerts,
  };
}

// 計算 RPC 成本估算
function calculateRpcCost(totalRequests: number): number {
  // Alchemy 免費計劃: 每月 300M 計算單位
  // 1 個請求 ≈ 1 計算單位
  const freeMonthlyUnits = 300_000_000;
  const costPerMillionAfterFree = 0.12; // $0.12 per 1M units
  
  // 假設這是每日請求量
  const monthlyRequests = totalRequests * 30;
  
  if (monthlyRequests <= freeMonthlyUnits) {
    return 0; // 在免費範圍內
  }
  
  const billableUnits = monthlyRequests - freeMonthlyUnits;
  const costInUSD = (billableUnits / 1_000_000) * costPerMillionAfterFree;
  
  return Math.round(costInUSD * 100) / 100; // 四捨五入到分
}

// 自動報告系統
class ProductionMonitoringService {
  private reportingInterval: NodeJS.Timeout | null = null;
  private config: ProductionMonitoringConfig;
  
  constructor() {
    this.config = getProductionMonitoringConfig();
  }
  
  // 啟動監控服務
  start(): void {
    if (!this.config.enableAutoReporting) return;
    
    logger.info('🚀 啟動生產環境 RPC 監控服務');
    
    // 立即生成一次報告
    this.sendReport();
    
    // TEMP_DISABLED: 暫時禁用定期報告以避免 RPC 過載
    /*
    this.reportingInterval = setInterval(() => {
      this.sendReport();
    }, this.config.reportingInterval);
    */
  }
  
  // 停止監控服務
  stop(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
  }
  
  // 發送報告
  private async sendReport(): Promise<void> {
    try {
      const report = await generateProductionReport();
      
      // 在控制台輸出報告摘要
      logger.info('📊 生產環境 RPC 使用報告', {
        totalRequests: report.rpcUsage.totalRequests,
        successRate: `${(report.rpcUsage.successRate * 100).toFixed(1)}%`,
        averageResponseTime: `${report.rpcUsage.averageResponseTime.toFixed(0)}ms`,
        estimatedCost: `$${report.rpcUsage.costEstimate}`,
        alerts: report.alerts.length,
      });
      
      // 如果有高優先級警報，特別記錄
      report.alerts
        .filter(alert => alert.severity === 'high')
        .forEach(alert => {
          logger.error(`🚨 高優先級警報: ${alert.message}`);
        });
      
      // 發送到後端分析服務（如果配置了）
      if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
        await this.sendToAnalytics(report);
      }
      
      // 存儲到本地（用於歷史查看）
      this.storeReport(report);
      
    } catch (error) {
      logger.error('生成生產環境報告失敗:', error);
    }
  }
  
  // 發送到分析服務
  private async sendToAnalytics(report: ProductionReport): Promise<void> {
    try {
      const response = await fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
      
      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }
    } catch (error) {
      logger.error('發送分析報告失敗:', error);
    }
  }
  
  // 存儲報告到本地
  private storeReport(report: ProductionReport): void {
    try {
      const key = `rpc_report_${report.timestamp}`;
      const reports = this.getStoredReports();
      
      // 保留最近 10 份報告
      reports.push(report);
      if (reports.length > 10) {
        reports.shift();
      }
      
      localStorage.setItem('rpc_production_reports', JSON.stringify(reports));
    } catch (error) {
      logger.error('存儲報告失敗:', error);
    }
  }
  
  // 獲取存儲的報告
  getStoredReports(): ProductionReport[] {
    try {
      const stored = localStorage.getItem('rpc_production_reports');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  // 獲取最新報告
  getLatestReport(): ProductionReport | null {
    const reports = this.getStoredReports();
    return reports[reports.length - 1] || null;
  }
}

// 創建單例服務
export const productionMonitoring = new ProductionMonitoringService();

// 在生產環境自動啟動
if (import.meta.env.PROD) {
  productionMonitoring.start();
}