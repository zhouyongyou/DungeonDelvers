// src/utils/rpcMonitor.ts - RPC 請求監控和統計系統

import { logger } from './logger';

// RPC 請求記錄接口
interface RpcRequest {
  id: string;
  url: string;
  method: string;
  params: any[];
  timestamp: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  error?: string;
  response?: any;
  source?: string; // 來源頁面或組件
  contractName?: string; // 合約名稱
  functionName?: string; // 函數名稱
  retryCount?: number;
}

// RPC 統計數據接口
interface RpcStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  averageResponseTime: number;
  requestsByMethod: Record<string, number>;
  requestsByContract: Record<string, number>;
  requestsByPage: Record<string, number>;
  errorsByType: Record<string, number>;
  hourlyRequests: number[];
  lastUpdated: number;
}

// 性能洞察接口
interface PerformanceInsight {
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

class RpcMonitor {
  private requests: Map<string, RpcRequest> = new Map();
  private completedRequests: RpcRequest[] = [];
  private stats: RpcStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalDuration: 0,
    averageResponseTime: 0,
    requestsByMethod: {},
    requestsByContract: {},
    requestsByPage: {},
    errorsByType: {},
    hourlyRequests: new Array(24).fill(0),
    lastUpdated: Date.now(),
  };
  private insights: PerformanceInsight[] = [];
  private isEnabled: boolean = true;
  private maxRequestHistory: number = 1000;
  private readonly STORAGE_KEY = 'rpc_monitor_data';

  constructor() {
    this.loadFromStorage();
    this.setupPeriodicAnalysis();
  }

  // 開始監控 RPC 請求
  startRequest(
    url: string,
    method: string,
    params: any[],
    source?: string,
    contractName?: string,
    functionName?: string
  ): string {
    if (!this.isEnabled) return '';

    const id = this.generateRequestId();
    const request: RpcRequest = {
      id,
      url,
      method,
      params,
      timestamp: Date.now(),
      startTime: performance.now(),
      status: 'pending',
      source,
      contractName,
      functionName,
      retryCount: 0,
    };

    this.requests.set(id, request);
    this.updateHourlyStats();

    logger.debug('🔍 RPC 請求開始:', {
      id,
      method,
      contractName,
      functionName,
      source,
    });

    return id;
  }

  // 完成 RPC 請求
  completeRequest(id: string, response?: any, error?: string): void {
    if (!this.isEnabled || !id) return;

    const request = this.requests.get(id);
    if (!request) return;

    request.endTime = performance.now();
    request.duration = request.endTime - request.startTime;
    request.status = error ? 'error' : 'success';
    request.response = response;
    request.error = error;

    // 更新統計數據
    this.updateStats(request);

    // 移動到已完成請求列表
    this.completedRequests.push(request);
    this.requests.delete(id);

    // 保持請求歷史在合理範圍內
    if (this.completedRequests.length > this.maxRequestHistory) {
      this.completedRequests.shift();
    }

    // 分析性能問題
    this.analyzeRequest(request);

    logger.debug('✅ RPC 請求完成:', {
      id,
      method: request.method,
      duration: request.duration?.toFixed(2) + 'ms',
      status: request.status,
      error,
    });

    // 定期保存到存儲
    this.saveToStorage();
  }

  // 記錄重試
  recordRetry(id: string): void {
    if (!this.isEnabled || !id) return;

    const request = this.requests.get(id);
    if (request) {
      request.retryCount = (request.retryCount || 0) + 1;
    }
  }

  // 獲取當前統計數據
  getStats(): RpcStats {
    return { ...this.stats };
  }

  // 獲取性能洞察
  getInsights(): PerformanceInsight[] {
    return [...this.insights];
  }

  // 獲取請求歷史
  getRequestHistory(limit: number = 50): RpcRequest[] {
    return this.completedRequests.slice(-limit);
  }

  // 獲取特定頁面的統計
  getPageStats(page: string): Partial<RpcStats> {
    const pageRequests = this.completedRequests.filter(
      req => req.source === page
    );

    if (pageRequests.length === 0) {
      return { totalRequests: 0 };
    }

    const successfulRequests = pageRequests.filter(
      req => req.status === 'success'
    ).length;
    const totalDuration = pageRequests.reduce(
      (sum, req) => sum + (req.duration || 0),
      0
    );

    return {
      totalRequests: pageRequests.length,
      successfulRequests,
      failedRequests: pageRequests.length - successfulRequests,
      averageResponseTime: totalDuration / pageRequests.length,
    };
  }

  // 獲取合約統計
  getContractStats(contractName: string): Partial<RpcStats> {
    const contractRequests = this.completedRequests.filter(
      req => req.contractName === contractName
    );

    if (contractRequests.length === 0) {
      return { totalRequests: 0 };
    }

    const successfulRequests = contractRequests.filter(
      req => req.status === 'success'
    ).length;
    const totalDuration = contractRequests.reduce(
      (sum, req) => sum + (req.duration || 0),
      0
    );

    return {
      totalRequests: contractRequests.length,
      successfulRequests,
      failedRequests: contractRequests.length - successfulRequests,
      averageResponseTime: totalDuration / contractRequests.length,
    };
  }

  // 清除統計數據
  clearStats(): void {
    this.requests.clear();
    this.completedRequests = [];
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDuration: 0,
      averageResponseTime: 0,
      requestsByMethod: {},
      requestsByContract: {},
      requestsByPage: {},
      errorsByType: {},
      hourlyRequests: new Array(24).fill(0),
      lastUpdated: Date.now(),
    };
    this.insights = [];
    this.clearStorage();
  }

  // 導出統計數據
  exportStats(): string {
    const exportData = {
      stats: this.stats,
      insights: this.insights,
      recentRequests: this.completedRequests.slice(-100),
      exportTime: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  // 啟用/禁用監控
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.info(`RPC 監控已${enabled ? '啟用' : '禁用'}`);
  }

  // 私有方法：生成請求ID
  private generateRequestId(): string {
    return `rpc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 私有方法：更新統計數據
  private updateStats(request: RpcRequest): void {
    this.stats.totalRequests++;
    this.stats.lastUpdated = Date.now();

    if (request.status === 'success') {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    if (request.duration) {
      this.stats.totalDuration += request.duration;
      this.stats.averageResponseTime =
        this.stats.totalDuration / this.stats.totalRequests;
    }

    // 更新方法統計
    this.stats.requestsByMethod[request.method] =
      (this.stats.requestsByMethod[request.method] || 0) + 1;

    // 更新合約統計
    if (request.contractName) {
      this.stats.requestsByContract[request.contractName] =
        (this.stats.requestsByContract[request.contractName] || 0) + 1;
    }

    // 更新頁面統計
    if (request.source) {
      this.stats.requestsByPage[request.source] =
        (this.stats.requestsByPage[request.source] || 0) + 1;
    }

    // 更新錯誤統計
    if (request.error) {
      const errorType = this.categorizeError(request.error);
      this.stats.errorsByType[errorType] =
        (this.stats.errorsByType[errorType] || 0) + 1;
    }
  }

  // 私有方法：更新小時統計
  private updateHourlyStats(): void {
    const hour = new Date().getHours();
    this.stats.hourlyRequests[hour]++;
  }

  // 私有方法：分析請求性能
  private analyzeRequest(request: RpcRequest): void {
    // 響應時間過長警告
    if (request.duration && request.duration > 3000) {
      this.addInsight({
        type: 'warning',
        title: '響應時間過長',
        description: `${request.method} 請求耗時 ${request.duration.toFixed(2)}ms`,
        suggestion: '考慮優化查詢或添加緩存',
        priority: 'high',
        timestamp: Date.now(),
      });
    }

    // 頻繁錯誤警告
    if (request.status === 'error' && request.retryCount && request.retryCount > 2) {
      this.addInsight({
        type: 'error',
        title: '頻繁請求失敗',
        description: `${request.method} 請求失敗 ${request.retryCount} 次`,
        suggestion: '檢查網絡連接或 RPC 節點狀態',
        priority: 'high',
        timestamp: Date.now(),
      });
    }
  }

  // 私有方法：添加性能洞察
  private addInsight(insight: PerformanceInsight): void {
    this.insights.push(insight);
    
    // 保持洞察數量在合理範圍內
    if (this.insights.length > 50) {
      this.insights.shift();
    }
  }

  // 私有方法：錯誤分類
  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('network')) return 'network';
    if (error.includes('reverted')) return 'contract_revert';
    if (error.includes('insufficient')) return 'insufficient_funds';
    return 'unknown';
  }

  // 私有方法：定期分析
  private setupPeriodicAnalysis(): void {
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 60000); // 每分鐘分析一次
  }

  // 私有方法：執行定期分析
  private performPeriodicAnalysis(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // 分析最近一分鐘的請求
    const recentRequests = this.completedRequests.filter(
      req => req.timestamp > oneMinuteAgo
    );

    if (recentRequests.length === 0) return;

    // 檢查請求頻率
    if (recentRequests.length > 60) {
      this.addInsight({
        type: 'warning',
        title: 'RPC 請求頻率過高',
        description: `最近一分鐘內發送了 ${recentRequests.length} 個請求`,
        suggestion: '考慮添加請求緩存或優化查詢頻率',
        priority: 'medium',
        timestamp: now,
      });
    }

    // 檢查錯誤率
    const errorRate = recentRequests.filter(req => req.status === 'error').length / recentRequests.length;
    if (errorRate > 0.1) {
      this.addInsight({
        type: 'error',
        title: 'RPC 錯誤率過高',
        description: `最近一分鐘錯誤率為 ${(errorRate * 100).toFixed(1)}%`,
        suggestion: '檢查 RPC 節點狀態或網絡連接',
        priority: 'high',
        timestamp: now,
      });
    }
  }

  // 私有方法：保存到本地存儲
  private saveToStorage(): void {
    try {
      const data = {
        stats: this.stats,
        insights: this.insights,
        recentRequests: this.completedRequests.slice(-100),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      logger.error('保存 RPC 監控數據失敗:', error);
    }
  }

  // 私有方法：從本地存儲載入
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.stats = { ...this.stats, ...parsed.stats };
        this.insights = parsed.insights || [];
        this.completedRequests = parsed.recentRequests || [];
      }
    } catch (error) {
      logger.error('載入 RPC 監控數據失敗:', error);
    }
  }

  // 私有方法：清除存儲
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      logger.error('清除 RPC 監控數據失敗:', error);
    }
  }
}

// 創建全局單例
export const rpcMonitor = new RpcMonitor();

// 開發環境下自動啟用監控
if (import.meta.env.DEV) {
  rpcMonitor.setEnabled(true);
}

// 導出類型
export type { RpcRequest, RpcStats, PerformanceInsight };