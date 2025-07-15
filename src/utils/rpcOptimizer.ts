// src/utils/rpcOptimizer.ts - RPC 性能優化器

// import { rpcMonitor } from './rpcMonitor'; // Removed RPC monitoring
// import { rpcAnalytics } from './rpcAnalytics'; // Removed RPC monitoring
import { logger } from './logger';

// 優化規則接口
interface OptimizationRule {
  name: string;
  description: string;
  check: (stats: any, history: any[]) => boolean;
  action: (stats: any, history: any[]) => Promise<void>;
  priority: 'high' | 'medium' | 'low';
}

// 自動優化建議
interface AutoOptimization {
  id: string;
  type: 'cache' | 'retry' | 'batch' | 'timeout';
  title: string;
  description: string;
  oldValue: any;
  newValue: any;
  reasoning: string;
  estimatedImpact: number; // 預估改進百分比
  autoApply: boolean;
  timestamp: number;
}

class RpcOptimizer {
  private optimizations: AutoOptimization[] = [];
  private rules: OptimizationRule[] = [];
  private isEnabled: boolean = true;
  private optimizationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupOptimizationRules();
    this.startOptimizationEngine();
  }

  // 設置優化規則
  private setupOptimizationRules(): void {
    this.rules = [
      {
        name: 'cache_optimization',
        description: '優化緩存策略',
        priority: 'high',
        check: (stats, history) => {
          const duplicateRequests = this.findDuplicateRequests(history);
          return duplicateRequests.length > 5;
        },
        action: this.optimizeCacheStrategy.bind(this),
      },
      {
        name: 'retry_optimization',
        description: '優化重試策略',
        priority: 'medium',
        check: (stats, history) => {
          const retryRate = this.calculateRetryRate(history);
          return retryRate > 0.15;
        },
        action: this.optimizeRetryStrategy.bind(this),
      },
      {
        name: 'batch_optimization',
        description: '批量請求優化',
        priority: 'medium',
        check: (stats, history) => {
          const batchableRequests = this.findBatchableRequests(history);
          return batchableRequests.length > 3;
        },
        action: this.optimizeBatchStrategy.bind(this),
      },
      {
        name: 'timeout_optimization',
        description: '超時設置優化',
        priority: 'low',
        check: (stats, history) => {
          return stats.averageResponseTime > 5000;
        },
        action: this.optimizeTimeoutStrategy.bind(this),
      },
    ];
  }

  // 啟動優化引擎
  private startOptimizationEngine(): void {
    if (this.optimizationInterval) return;

    this.optimizationInterval = setInterval(() => {
      this.runOptimizationCheck();
    }, 60000); // 每分鐘檢查一次
  }

  // 停止優化引擎
  public stopOptimizationEngine(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
  }

  // 執行優化檢查
  private async runOptimizationCheck(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // RPC monitoring disabled
      const stats = { totalRequests: 0, averageResponseTime: 0, failedRequests: 0, requestsByMethod: {} };
      const history = [];

      for (const rule of this.rules) {
        if (rule.check(stats, history)) {
          logger.info(`觸發優化規則: ${rule.name}`);
          await rule.action(stats, history);
        }
      }
    } catch (error) {
      logger.error('優化檢查失敗:', error);
    }
  }

  // 優化緩存策略
  private async optimizeCacheStrategy(stats: any, history: any[]): Promise<void> {
    const duplicateRequests = this.findDuplicateRequests(history);
    
    duplicateRequests.forEach(group => {
      const avgResponseTime = this.calculateAverageResponseTime(group);
      const frequency = group.length;
      
      let recommendedStaleTime = 1000 * 60 * 5; // 默認5分鐘
      let recommendedGcTime = 1000 * 60 * 15; // 默認15分鐘
      
      // 基於響應時間和頻率調整
      if (avgResponseTime > 2000 && frequency > 10) {
        recommendedStaleTime = 1000 * 60 * 15; // 15分鐘
        recommendedGcTime = 1000 * 60 * 45; // 45分鐘
      } else if (frequency > 20) {
        recommendedStaleTime = 1000 * 60 * 10; // 10分鐘
        recommendedGcTime = 1000 * 60 * 30; // 30分鐘
      }

      this.addOptimization({
        id: `cache_${Date.now()}_${Math.random()}`,
        type: 'cache',
        title: '優化緩存設置',
        description: `${group[0].contractName || 'Unknown'}.${group[0].functionName || 'Unknown'} 出現 ${frequency} 次重複請求`,
        oldValue: { staleTime: 0, gcTime: 0 },
        newValue: { staleTime: recommendedStaleTime, gcTime: recommendedGcTime },
        reasoning: `基於 ${frequency} 次重複請求和 ${avgResponseTime.toFixed(0)}ms 平均響應時間`,
        estimatedImpact: Math.min(80, frequency * 2), // 預估改進百分比
        autoApply: false,
        timestamp: Date.now(),
      });
    });
  }

  // 優化重試策略
  private async optimizeRetryStrategy(stats: any, history: any[]): Promise<void> {
    const retryRate = this.calculateRetryRate(history);
    const avgRetryCount = this.calculateAverageRetryCount(history);
    
    let recommendedMaxRetries = 3;
    let recommendedRetryDelay = 1000;
    
    if (retryRate > 0.3) {
      // 重試率過高，減少重試次數，增加延遲
      recommendedMaxRetries = 2;
      recommendedRetryDelay = 2000;
    } else if (retryRate > 0.2) {
      // 中等重試率，調整延遲
      recommendedMaxRetries = 3;
      recommendedRetryDelay = 1500;
    }

    this.addOptimization({
      id: `retry_${Date.now()}_${Math.random()}`,
      type: 'retry',
      title: '優化重試設置',
      description: `當前重試率為 ${(retryRate * 100).toFixed(1)}%，平均重試 ${avgRetryCount.toFixed(1)} 次`,
      oldValue: { maxRetries: 3, retryDelay: 1000 },
      newValue: { maxRetries: recommendedMaxRetries, retryDelay: recommendedRetryDelay },
      reasoning: `基於 ${(retryRate * 100).toFixed(1)}% 重試率優化`,
      estimatedImpact: Math.min(50, retryRate * 100),
      autoApply: false,
      timestamp: Date.now(),
    });
  }

  // 優化批量策略
  private async optimizeBatchStrategy(stats: any, history: any[]): Promise<void> {
    const batchableRequests = this.findBatchableRequests(history);
    
    batchableRequests.forEach(group => {
      if (group.length > 2) {
        this.addOptimization({
          id: `batch_${Date.now()}_${Math.random()}`,
          type: 'batch',
          title: '批量請求優化',
          description: `發現 ${group.length} 個可以合併的 ${group[0].contractName} 請求`,
          oldValue: { batchSize: 1 },
          newValue: { batchSize: group.length },
          reasoning: `可以將 ${group.length} 個單獨請求合併為一個批量請求`,
          estimatedImpact: Math.min(70, group.length * 10),
          autoApply: false,
          timestamp: Date.now(),
        });
      }
    });
  }

  // 優化超時策略
  private async optimizeTimeoutStrategy(stats: any, history: any[]): Promise<void> {
    const avgResponseTime = stats.averageResponseTime;
    const p95ResponseTime = this.calculateP95ResponseTime(history);
    
    let recommendedTimeout = Math.max(avgResponseTime * 2, 10000); // 至少10秒
    
    if (p95ResponseTime > avgResponseTime * 1.5) {
      recommendedTimeout = p95ResponseTime * 1.2; // P95 * 1.2
    }

    this.addOptimization({
      id: `timeout_${Date.now()}_${Math.random()}`,
      type: 'timeout',
      title: '超時設置優化',
      description: `平均響應時間 ${avgResponseTime.toFixed(0)}ms，P95 響應時間 ${p95ResponseTime.toFixed(0)}ms`,
      oldValue: { timeout: 5000 },
      newValue: { timeout: recommendedTimeout },
      reasoning: `基於 P95 響應時間 ${p95ResponseTime.toFixed(0)}ms 調整`,
      estimatedImpact: 20,
      autoApply: false,
      timestamp: Date.now(),
    });
  }

  // 手動應用優化
  public async applyOptimization(optimizationId: string): Promise<boolean> {
    const optimization = this.optimizations.find(opt => opt.id === optimizationId);
    if (!optimization) return false;

    try {
      // 這裡可以實現實際的優化應用邏輯
      logger.info(`應用優化: ${optimization.title}`, optimization.newValue);
      
      // 標記為已應用
      optimization.autoApply = true;
      
      return true;
    } catch (error) {
      logger.error(`應用優化失敗: ${optimization.title}`, error);
      return false;
    }
  }

  // 生成智能配置建議
  public generateSmartConfig(): {
    cacheConfig: Record<string, any>;
    retryConfig: Record<string, any>;
    batchConfig: Record<string, any>;
  } {
    // RPC monitoring disabled
    const stats = { totalRequests: 0, averageResponseTime: 0, failedRequests: 0, requestsByMethod: {} };
    const history = [];

    return {
      cacheConfig: this.generateCacheConfig(stats, history),
      retryConfig: this.generateRetryConfig(stats, history),
      batchConfig: this.generateBatchConfig(stats, history),
    };
  }

  // 生成緩存配置
  private generateCacheConfig(stats: any, history: any[]): Record<string, any> {
    const contractGroups = this.groupByContract(history);
    const cacheConfig: Record<string, any> = {};

    Object.entries(contractGroups).forEach(([contractName, requests]) => {
      const avgResponseTime = this.calculateAverageResponseTime(requests);
      const frequency = requests.length;

      let staleTime = 1000 * 60 * 5; // 默認5分鐘
      let gcTime = 1000 * 60 * 15; // 默認15分鐘

      // 基於頻率和響應時間調整
      if (frequency > 20 && avgResponseTime > 1000) {
        staleTime = 1000 * 60 * 15; // 15分鐘
        gcTime = 1000 * 60 * 45; // 45分鐘
      } else if (frequency > 10) {
        staleTime = 1000 * 60 * 10; // 10分鐘
        gcTime = 1000 * 60 * 30; // 30分鐘
      }

      cacheConfig[contractName] = {
        staleTime,
        gcTime,
        refetchOnWindowFocus: frequency < 5, // 低頻請求才在窗口焦點時刷新
      };
    });

    return cacheConfig;
  }

  // 生成重試配置
  private generateRetryConfig(stats: any, history: any[]): Record<string, any> {
    const errorRate = stats.totalRequests > 0 ? stats.failedRequests / stats.totalRequests : 0;
    
    let maxRetries = 3;
    let retryDelay = 1000;

    if (errorRate > 0.2) {
      maxRetries = 2;
      retryDelay = 2000;
    } else if (errorRate > 0.1) {
      maxRetries = 3;
      retryDelay = 1500;
    }

    return {
      maxRetries,
      retryDelay,
      exponentialBackoff: true,
    };
  }

  // 生成批量配置
  private generateBatchConfig(stats: any, history: any[]): Record<string, any> {
    const batchableRequests = this.findBatchableRequests(history);
    
    return {
      enableBatching: batchableRequests.length > 0,
      batchSize: Math.min(10, Math.max(3, batchableRequests.length)),
      batchDelay: 100, // 100ms 批量延遲
    };
  }

  // 獲取優化建議
  public getOptimizations(): AutoOptimization[] {
    return [...this.optimizations];
  }

  // 清除優化建議
  public clearOptimizations(): void {
    this.optimizations = [];
  }

  // 設置啟用狀態
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      this.startOptimizationEngine();
    } else {
      this.stopOptimizationEngine();
    }
  }

  // 私有方法：添加優化建議
  private addOptimization(optimization: AutoOptimization): void {
    this.optimizations.push(optimization);
    
    // 保持建議數量在合理範圍內
    if (this.optimizations.length > 20) {
      this.optimizations.shift();
    }
  }

  // 私有方法：查找重複請求
  private findDuplicateRequests(history: any[]): Array<any[]> {
    const groups = new Map<string, any[]>();
    
    history.forEach(req => {
      const key = `${req.contractName}-${req.functionName}-${JSON.stringify(req.params)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(req);
    });

    return Array.from(groups.values()).filter(group => group.length > 1);
  }

  // 私有方法：查找可批量的請求
  private findBatchableRequests(history: any[]): Array<any[]> {
    const groups = new Map<string, any[]>();
    
    history.forEach(req => {
      const key = `${req.contractName}-${req.timestamp}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(req);
    });

    return Array.from(groups.values()).filter(group => group.length > 2);
  }

  // 私有方法：計算平均響應時間
  private calculateAverageResponseTime(requests: any[]): number {
    const validRequests = requests.filter(req => req.duration);
    if (validRequests.length === 0) return 0;
    
    const total = validRequests.reduce((sum, req) => sum + req.duration, 0);
    return total / validRequests.length;
  }

  // 私有方法：計算重試率
  private calculateRetryRate(history: any[]): number {
    const requestsWithRetry = history.filter(req => req.retryCount && req.retryCount > 0);
    return history.length > 0 ? requestsWithRetry.length / history.length : 0;
  }

  // 私有方法：計算平均重試次數
  private calculateAverageRetryCount(history: any[]): number {
    const requestsWithRetry = history.filter(req => req.retryCount && req.retryCount > 0);
    if (requestsWithRetry.length === 0) return 0;
    
    const total = requestsWithRetry.reduce((sum, req) => sum + req.retryCount, 0);
    return total / requestsWithRetry.length;
  }

  // 私有方法：計算P95響應時間
  private calculateP95ResponseTime(history: any[]): number {
    const durations = history
      .filter(req => req.duration)
      .map(req => req.duration)
      .sort((a, b) => a - b);
    
    if (durations.length === 0) return 0;
    
    const p95Index = Math.floor(durations.length * 0.95);
    return durations[p95Index];
  }

  // 私有方法：按合約分組
  private groupByContract(history: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    history.forEach(req => {
      const contractName = req.contractName || 'unknown';
      if (!groups[contractName]) {
        groups[contractName] = [];
      }
      groups[contractName].push(req);
    });

    return groups;
  }
}

// 創建全局實例
export const rpcOptimizer = new RpcOptimizer();

// 開發環境下自動啟用
if (import.meta.env.DEV) {
  rpcOptimizer.setEnabled(true);
}

// 導出類型
export type { AutoOptimization, OptimizationRule };