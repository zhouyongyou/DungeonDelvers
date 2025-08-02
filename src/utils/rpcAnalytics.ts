// src/utils/rpcAnalytics.ts - RPC 分析和統計工具

// import { rpcMonitor } from './rpcMonitor'; // Removed RPC monitoring
// import type { RpcRequest, RpcStats, PerformanceInsight } from './rpcMonitor';

// Mock types for disabled RPC monitoring
type RpcRequest = any;
type RpcStats = any;
type PerformanceInsight = any;
import { logger } from './logger';

// 分析結果接口
interface AnalyticsResult {
  summary: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    topErrors: Array<{ type: string; count: number }>;
  };
  performance: {
    slowestRequests: RpcRequest[];
    fastestRequests: RpcRequest[];
    responseTimeDistribution: Array<{ range: string; count: number }>;
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  usage: {
    topMethods: Array<{ method: string; count: number }>;
    topContracts: Array<{ contract: string; count: number }>;
    topPages: Array<{ page: string; count: number }>;
    hourlyDistribution: number[];
  };
  insights: PerformanceInsight[];
  recommendations: string[];
}

// 緩存策略建議
interface CacheRecommendation {
  queryKey: string;
  recommendedStaleTime: number;
  recommendedGcTime: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

// 優化建議
interface OptimizationSuggestion {
  type: 'cache' | 'batch' | 'reduce' | 'retry' | 'timeout';
  title: string;
  description: string;
  implementation: string;
  expectedImpact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
}

class RpcAnalytics {
  // 生成完整的分析報告 - RPC monitoring disabled
  generateReport(): AnalyticsResult {
    // RPC monitoring disabled - return mock data
    return {
      summary: {
        totalRequests: 0,
        successRate: 100,
        averageResponseTime: 0,
        errorRate: 0,
        topErrors: [],
      },
      performance: {
        slowestRequests: [],
        fastestRequests: [],
        responseTimeDistribution: [],
        performanceGrade: 'A',
      },
      usage: {
        topMethods: [],
        topContracts: [],
        topPages: [],
        hourlyDistribution: new Array(24).fill(0),
      },
      insights: [],
      recommendations: ['RPC monitoring has been disabled'],
    };
  }

  // 生成緩存建議 - RPC monitoring disabled
  generateCacheRecommendations(): CacheRecommendation[] {
    // RPC monitoring disabled
    return [];
    const recommendations: CacheRecommendation[] = [];

    // 按合約和方法分組
    const requestGroups = this.groupRequestsByContractAndMethod(requestHistory);

    for (const [key, requests] of Object.entries(requestGroups)) {
      const [contract, method] = key.split('.');
      const avgResponseTime = this.calculateAverageResponseTime(requests);
      const frequency = requests.length;

      // 高頻且響應時間較長的請求建議長時間緩存
      if (frequency > 10 && avgResponseTime > 1000) {
        recommendations.push({
          queryKey: key,
          recommendedStaleTime: 1000 * 60 * 10, // 10分鐘
          recommendedGcTime: 1000 * 60 * 30, // 30分鐘
          reason: `高頻請求 (${frequency} 次) 且響應時間較長 (${avgResponseTime.toFixed(0)}ms)`,
          priority: 'high',
        });
      }
      // 中頻請求建議中等緩存
      else if (frequency > 5) {
        recommendations.push({
          queryKey: key,
          recommendedStaleTime: 1000 * 60 * 5, // 5分鐘
          recommendedGcTime: 1000 * 60 * 15, // 15分鐘
          reason: `中頻請求 (${frequency} 次)`,
          priority: 'medium',
        });
      }
      // 低頻但響應時間長的請求建議短時間緩存
      else if (avgResponseTime > 2000) {
        recommendations.push({
          queryKey: key,
          recommendedStaleTime: 1000 * 60 * 2, // 2分鐘
          recommendedGcTime: 1000 * 60 * 10, // 10分鐘
          reason: `響應時間較長 (${avgResponseTime.toFixed(0)}ms)`,
          priority: 'low',
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // 生成優化建議 - RPC monitoring disabled
  generateOptimizationSuggestions(): OptimizationSuggestion[] {
    // RPC monitoring disabled
    return [];
    const suggestions: OptimizationSuggestion[] = [];

    // 分析重複請求
    const duplicates = this.findDuplicateRequests(requestHistory);
    if (duplicates.length > 0) {
      suggestions.push({
        type: 'batch',
        title: '合併重複請求',
        description: `發現 ${duplicates.length} 組重複請求，可以合併以減少 RPC 調用`,
        implementation: '使用 useReadContracts 或實現請求去重機制',
        expectedImpact: 'high',
        difficulty: 'medium',
      });
    }

    // 分析緩存效率
    const lowCacheHitRate = this.calculateCacheEfficiency(requestHistory);
    if (lowCacheHitRate < 0.6) {
      suggestions.push({
        type: 'cache',
        title: '優化緩存策略',
        description: `緩存命中率較低 (${(lowCacheHitRate * 100).toFixed(1)}%)`,
        implementation: '增加 staleTime 和 gcTime 配置',
        expectedImpact: 'high',
        difficulty: 'easy',
      });
    }

    // 分析錯誤重試
    const highRetryRate = this.calculateRetryRate(requestHistory);
    if (highRetryRate > 0.1) {
      suggestions.push({
        type: 'retry',
        title: '優化重試策略',
        description: `重試率較高 (${(highRetryRate * 100).toFixed(1)}%)`,
        implementation: '調整重試間隔和最大重試次數',
        expectedImpact: 'medium',
        difficulty: 'easy',
      });
    }

    // 分析響應時間
    const avgResponseTime = stats.averageResponseTime;
    if (avgResponseTime > 1500) {
      suggestions.push({
        type: 'timeout',
        title: '調整超時設置',
        description: `平均響應時間較長 (${avgResponseTime.toFixed(0)}ms)`,
        implementation: '增加請求超時時間或優化 RPC 節點選擇',
        expectedImpact: 'medium',
        difficulty: 'medium',
      });
    }

    return suggestions;
  }

  // 檢測性能瓶頸 - RPC monitoring disabled
  detectBottlenecks(): Array<{ type: string; description: string; impact: string }> {
    // RPC monitoring disabled
    return [];
    const bottlenecks: Array<{ type: string; description: string; impact: string }> = [];

    // 高頻請求頁面
    const topPages = Object.entries(stats.requestsByPage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    topPages.forEach(([page, count]) => {
      if (count > 50) {
        bottlenecks.push({
          type: 'high_frequency_page',
          description: `頁面 ${page} 產生了 ${count} 個 RPC 請求`,
          impact: 'high',
        });
      }
    });

    // 慢請求分析
    const slowRequests = requestHistory.filter(req => req.duration && req.duration > 3000);
    if (slowRequests.length > 0) {
      bottlenecks.push({
        type: 'slow_requests',
        description: `發現 ${slowRequests.length} 個響應時間超過 3 秒的請求`,
        impact: 'high',
      });
    }

    // 錯誤集中度
    const errorTypes = Object.entries(stats.errorsByType);
    errorTypes.forEach(([type, count]) => {
      if (count > 10) {
        bottlenecks.push({
          type: 'error_concentration',
          description: `${type} 錯誤出現 ${count} 次`,
          impact: 'medium',
        });
      }
    });

    return bottlenecks;
  }

  // 生成性能報告
  generatePerformanceReport(): string {
    // RPC monitoring disabled
    return 'RPC performance monitoring has been disabled.';

    const reportLines = [
      '🔍 RPC 性能分析報告',
      '=' .repeat(50),
      '',
      '📊 總覽',
      `• 總請求數: ${report.summary.totalRequests}`,
      `• 成功率: ${(report.summary.successRate * 100).toFixed(1)}%`,
      `• 平均響應時間: ${report.summary.averageResponseTime.toFixed(0)}ms`,
      `• 錯誤率: ${(report.summary.errorRate * 100).toFixed(1)}%`,
      `• 性能等級: ${report.performance.performanceGrade}`,
      '',
      '⚡ 性能瓶頸',
      ...bottlenecks.map(b => `• ${b.description} (影響: ${b.impact})`),
      '',
      '💡 優化建議',
      ...optimizationSuggestions.slice(0, 5).map(s => `• ${s.title}: ${s.description}`),
      '',
      '🔄 緩存建議',
      ...cacheRecommendations.slice(0, 5).map(c => `• ${c.queryKey}: ${c.reason}`),
      '',
      '📈 使用統計',
      `• 最頻繁的方法: ${report.usage.topMethods.map(m => `${m.method}(${m.count})`).join(', ')}`,
      `• 最活躍的合約: ${report.usage.topContracts.map(c => `${c.contract}(${c.count})`).join(', ')}`,
      `• 最活躍的頁面: ${report.usage.topPages.map(p => `${p.page}(${p.count})`).join(', ')}`,
      '',
      '⚠️ 最新洞察',
      ...report.insights.slice(0, 3).map(i => `• ${i.title}: ${i.description}`),
      '',
      `📅 報告生成時間: ${new Date().toLocaleString()}`,
    ];

    return reportLines.join('\n');
  }

  // 私有方法：生成摘要
  private generateSummary(stats: RpcStats, requests: RpcRequest[]) {
    const totalRequests = stats.totalRequests;
    const successRate = totalRequests > 0 ? stats.successfulRequests / totalRequests : 0;
    const errorRate = totalRequests > 0 ? stats.failedRequests / totalRequests : 0;
    const topErrors = Object.entries(stats.errorsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      totalRequests,
      successRate,
      averageResponseTime: stats.averageResponseTime,
      errorRate,
      topErrors,
    };
  }

  // 私有方法：分析性能
  private analyzePerformance(requests: RpcRequest[]) {
    const validRequests = requests.filter(req => req.duration && req.status === 'success');
    const slowestRequests = validRequests
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);
    const fastestRequests = validRequests
      .sort((a, b) => (a.duration || 0) - (b.duration || 0))
      .slice(0, 10);

    // 響應時間分布
    const responseTimeDistribution = this.calculateResponseTimeDistribution(validRequests);
    
    // 性能等級
    const avgResponseTime = validRequests.reduce((sum, req) => sum + (req.duration || 0), 0) / validRequests.length;
    const performanceGrade = this.calculatePerformanceGrade(avgResponseTime);

    return {
      slowestRequests,
      fastestRequests,
      responseTimeDistribution,
      performanceGrade,
    };
  }

  // 私有方法：分析使用情況
  private analyzeUsage(stats: RpcStats, requests: RpcRequest[]) {
    const topMethods = Object.entries(stats.requestsByMethod)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([method, count]) => ({ method, count }));

    const topContracts = Object.entries(stats.requestsByContract)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([contract, count]) => ({ contract, count }));

    const topPages = Object.entries(stats.requestsByPage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([page, count]) => ({ page, count }));

    return {
      topMethods,
      topContracts,
      topPages,
      hourlyDistribution: stats.hourlyRequests,
    };
  }

  // 私有方法：生成建議
  private generateRecommendations(stats: RpcStats, requests: RpcRequest[]): string[] {
    const recommendations: string[] = [];

    // 基於統計數據的建議
    if (stats.averageResponseTime > 1000) {
      recommendations.push('考慮增加緩存時間以減少重複請求');
    }

    if (stats.failedRequests / stats.totalRequests > 0.05) {
      recommendations.push('檢查網絡連接和 RPC 節點配置');
    }

    // 基於使用模式的建議
    const topPage = Object.entries(stats.requestsByPage)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (topPage && topPage[1] > 20) {
      recommendations.push(`優化 ${topPage[0]} 頁面的 RPC 使用，當前請求過多`);
    }

    return recommendations;
  }

  // 私有方法：按合約和方法分組請求
  private groupRequestsByContractAndMethod(requests: RpcRequest[]): Record<string, RpcRequest[]> {
    const groups: Record<string, RpcRequest[]> = {};

    requests.forEach(req => {
      const key = `${req.contractName || 'unknown'}.${req.functionName || req.method}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(req);
    });

    return groups;
  }

  // 私有方法：計算平均響應時間
  private calculateAverageResponseTime(requests: RpcRequest[]): number {
    const validRequests = requests.filter(req => req.duration);
    if (validRequests.length === 0) return 0;

    const totalTime = validRequests.reduce((sum, req) => sum + (req.duration || 0), 0);
    return totalTime / validRequests.length;
  }

  // 私有方法：查找重複請求
  private findDuplicateRequests(requests: RpcRequest[]): Array<RpcRequest[]> {
    const duplicates: Array<RpcRequest[]> = [];
    const requestMap = new Map<string, RpcRequest[]>();

    requests.forEach(req => {
      const key = `${req.method}-${JSON.stringify(req.params)}`;
      if (!requestMap.has(key)) {
        requestMap.set(key, []);
      }
      requestMap.get(key)!.push(req);
    });

    requestMap.forEach(reqs => {
      if (reqs.length > 1) {
        duplicates.push(reqs);
      }
    });

    return duplicates;
  }

  // 私有方法：計算緩存效率
  private calculateCacheEfficiency(requests: RpcRequest[]): number {
    // 簡化版本：假設相同的請求在短時間內是緩存命中
    const timeWindow = 60000; // 1分鐘
    let cacheHits = 0;
    const totalRequests = requests.length;

    const requestMap = new Map<string, number>();

    requests.forEach(req => {
      const key = `${req.method}-${JSON.stringify(req.params)}`;
      const lastTime = requestMap.get(key);
      
      if (lastTime && (req.timestamp - lastTime) < timeWindow) {
        cacheHits++;
      }
      
      requestMap.set(key, req.timestamp);
    });

    return totalRequests > 0 ? cacheHits / totalRequests : 0;
  }

  // 私有方法：計算重試率
  private calculateRetryRate(requests: RpcRequest[]): number {
    const requestsWithRetry = requests.filter(req => req.retryCount && req.retryCount > 0);
    return requests.length > 0 ? requestsWithRetry.length / requests.length : 0;
  }

  // 私有方法：計算響應時間分布
  private calculateResponseTimeDistribution(requests: RpcRequest[]): Array<{ range: string; count: number }> {
    const ranges = [
      { range: '0-100ms', min: 0, max: 100 },
      { range: '100-500ms', min: 100, max: 500 },
      { range: '500ms-1s', min: 500, max: 1000 },
      { range: '1s-3s', min: 1000, max: 3000 },
      { range: '3s+', min: 3000, max: Infinity },
    ];

    return ranges.map(range => ({
      range: range.range,
      count: requests.filter(req => 
        req.duration && req.duration >= range.min && req.duration < range.max
      ).length,
    }));
  }

  // 私有方法：計算性能等級
  private calculatePerformanceGrade(avgResponseTime: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (avgResponseTime < 300) return 'A';
    if (avgResponseTime < 600) return 'B';
    if (avgResponseTime < 1200) return 'C';
    if (avgResponseTime < 2400) return 'D';
    return 'F';
  }
}

// 創建全局實例
export const rpcAnalytics = new RpcAnalytics();

// TEMP_DISABLED: 暫時禁用開發環境定期分析報告以避免 RPC 過載
/*
if (import.meta.env.DEV) {
  setInterval(() => {
    const report = rpcAnalytics.generatePerformanceReport();
    logger.info('📊 RPC 性能報告:\n' + report);
  }, 300000); // 每5分鐘
}
*/

// 導出類型
export type { 
  AnalyticsResult, 
  CacheRecommendation, 
  OptimizationSuggestion 
};

// 也導出類本身
export { RpcAnalytics };