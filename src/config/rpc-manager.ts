// Alchemy RPC 智能管理器
// 支援自動故障轉移和負載均衡

interface RPCEndpoint {
  url: string;
  key: string;
  priority: number;
  failures: number;
  lastFailure?: number;
  responseTime?: number;
}

class AlchemyRPCManager {
  private endpoints: RPCEndpoint[] = [];
  private currentEndpoint: RPCEndpoint | null = null;
  private maxFailures = 3;
  private failureCooldown = 60000; // 1分鐘冷卻

  constructor() {
    this.initializeEndpoints();
    this.selectBestEndpoint();
  }

  private initializeEndpoints() {
    const primaryKey = import.meta.env.VITE_ALCHEMY_PRIMARY_KEY;
    const backendKey = import.meta.env.VITE_ALCHEMY_BACKEND_KEY;
    const backupKeys = import.meta.env.VITE_ALCHEMY_BACKUP_KEYS?.split(',') || [];

    if (primaryKey) {
      this.endpoints.push({
        url: `https://bnb-mainnet.g.alchemy.com/v2/${primaryKey}`,
        key: primaryKey,
        priority: 1,
        failures: 0
      });
    }

    if (backendKey) {
      this.endpoints.push({
        url: `https://bnb-mainnet.g.alchemy.com/v2/${backendKey}`,
        key: backendKey,
        priority: 2,
        failures: 0
      });
    }

    backupKeys.forEach((key, index) => {
      if (key.trim()) {
        this.endpoints.push({
          url: `https://bnb-mainnet.g.alchemy.com/v2/${key.trim()}`,
          key: key.trim(),
          priority: 3 + index,
          failures: 0
        });
      }
    });

    // 如果沒有 Alchemy 配置，使用公共 RPC
    if (this.endpoints.length === 0) {
      this.endpoints.push({
        url: 'https://bsc-dataseed1.binance.org/',
        key: 'public-binance',
        priority: 10,
        failures: 0
      });
    }
  }

  private selectBestEndpoint(): RPCEndpoint {
    const now = Date.now();
    
    // 過濾掉失敗次數過多且仍在冷卻期的端點
    const availableEndpoints = this.endpoints.filter(endpoint => {
      if (endpoint.failures < this.maxFailures) return true;
      if (!endpoint.lastFailure) return true;
      return now - endpoint.lastFailure > this.failureCooldown;
    });

    if (availableEndpoints.length === 0) {
      // 所有端點都失敗，重置失敗計數並使用優先級最高的
      this.endpoints.forEach(endpoint => {
        endpoint.failures = 0;
        endpoint.lastFailure = undefined;
      });
      this.currentEndpoint = this.endpoints.sort((a, b) => a.priority - b.priority)[0];
    } else {
      // 選擇優先級最高且響應時間最快的端點
      this.currentEndpoint = availableEndpoints.sort((a, b) => {
        const priorityDiff = a.priority - b.priority;
        if (priorityDiff !== 0) return priorityDiff;
        
        const aTime = a.responseTime || Infinity;
        const bTime = b.responseTime || Infinity;
        return aTime - bTime;
      })[0];
    }

    return this.currentEndpoint;
  }

  public getCurrentRPCUrl(): string {
    if (!this.currentEndpoint) {
      this.selectBestEndpoint();
    }
    return this.currentEndpoint?.url || import.meta.env.VITE_RPC_URL || 'https://bsc-dataseed1.binance.org/';
  }

  public async testEndpoint(endpoint: RPCEndpoint): Promise<number> {
    const startTime = Date.now();
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await response.json();
      
      const responseTime = Date.now() - startTime;
      endpoint.responseTime = responseTime;
      endpoint.failures = 0; // 成功後重置失敗計數
      return responseTime;
    } catch (error) {
      endpoint.failures++;
      endpoint.lastFailure = Date.now();
      throw error;
    }
  }

  public async benchmarkEndpoints(): Promise<void> {
    console.group('🚀 Alchemy RPC 節點性能測試');
    
    const results = await Promise.allSettled(
      this.endpoints.map(async endpoint => {
        try {
          const responseTime = await this.testEndpoint(endpoint);
          console.log(`✅ ${endpoint.key}: ${responseTime}ms`);
          return { endpoint, responseTime };
        } catch (error) {
          console.log(`❌ ${endpoint.key}: 失敗`);
          return { endpoint, responseTime: Infinity };
        }
      })
    );

    // 重新選擇最佳端點
    this.selectBestEndpoint();
    console.log(`🎯 選擇端點: ${this.currentEndpoint?.key} (${this.currentEndpoint?.responseTime}ms)`);
    console.groupEnd();
  }

  public reportFailure(): void {
    if (this.currentEndpoint) {
      this.currentEndpoint.failures++;
      this.currentEndpoint.lastFailure = Date.now();
      
      if (this.currentEndpoint.failures >= this.maxFailures) {
        console.warn(`⚠️ RPC 端點失敗過多，切換到備用端點: ${this.currentEndpoint.key}`);
        this.selectBestEndpoint();
      }
    }
  }

  public getStatus() {
    return {
      current: {
        key: this.currentEndpoint?.key,
        url: this.currentEndpoint?.url,
        failures: this.currentEndpoint?.failures,
        responseTime: this.currentEndpoint?.responseTime
      },
      endpoints: this.endpoints.map(ep => ({
        key: ep.key,
        priority: ep.priority,
        failures: ep.failures,
        responseTime: ep.responseTime,
        available: ep.failures < this.maxFailures
      }))
    };
  }
}

// 創建全局 RPC 管理器實例
export const rpcManager = new AlchemyRPCManager();

// 開發模式下進行性能測試
if (import.meta.env.DEV) {
  // 延遲執行避免阻塞初始化
  setTimeout(() => {
    rpcManager.benchmarkEndpoints();
  }, 2000);
}

// 導出便捷函數
export const getCurrentRPC = () => rpcManager.getCurrentRPCUrl();
export const reportRPCFailure = () => rpcManager.reportFailure();
export const getRPCStatus = () => rpcManager.getStatus();