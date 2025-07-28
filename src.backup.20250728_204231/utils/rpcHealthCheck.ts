// src/utils/rpcHealthCheck.ts - RPC 節點健康檢查和管理

import { logger } from './logger';
import { BSC_PUBLIC_RPCS, testRpcConnection } from '../config/rpc';

interface RpcNode {
  url: string;
  latency: number;
  lastCheck: number;
  isHealthy: boolean;
  failureCount: number;
}

class RpcHealthManager {
  private nodes: Map<string, RpcNode> = new Map();
  private currentIndex = 0;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly MAX_FAILURES = 3;
  private readonly CHECK_INTERVAL = 30000; // 30 秒
  private readonly LATENCY_THRESHOLD = 3000; // 3 秒

  constructor() {
    // 初始化節點
    BSC_PUBLIC_RPCS.forEach(url => {
      this.nodes.set(url, {
        url,
        latency: 0,
        lastCheck: 0,
        isHealthy: true,
        failureCount: 0,
      });
    });
  }

  /**
   * 開始健康檢查
   */
  startHealthCheck() {
    if (this.checkInterval) return;

    // 立即執行一次檢查
    this.performHealthCheck();

    // TEMP_DISABLED: 暫時禁用健康檢查輪詢以避免 RPC 過載
    /*
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.CHECK_INTERVAL);
    */
  }

  /**
   * 停止健康檢查
   */
  stopHealthCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 執行健康檢查
   */
  private async performHealthCheck() {
    logger.debug('開始 RPC 節點健康檢查');

    const checks = Array.from(this.nodes.values()).map(async (node) => {
      const start = Date.now();
      const isHealthy = await testRpcConnection(node.url);
      const latency = Date.now() - start;

      // 更新節點狀態
      node.latency = latency;
      node.lastCheck = Date.now();
      node.isHealthy = isHealthy && latency < this.LATENCY_THRESHOLD;

      if (!node.isHealthy) {
        node.failureCount++;
        logger.warn(`RPC 節點不健康: ${node.url}`, {
          latency,
          failureCount: node.failureCount,
        });
      } else {
        node.failureCount = 0;
      }

      return node;
    });

    await Promise.all(checks);

    // 記錄健康狀態
    const healthyNodes = Array.from(this.nodes.values()).filter(n => n.isHealthy);
    logger.info(`RPC 健康檢查完成: ${healthyNodes.length}/${this.nodes.size} 節點健康`);
  }

  /**
   * 獲取最快的健康節點
   */
  getFastestHealthyNode(): string | null {
    const healthyNodes = Array.from(this.nodes.values())
      .filter(n => n.isHealthy && n.failureCount < this.MAX_FAILURES)
      .sort((a, b) => a.latency - b.latency);

    if (healthyNodes.length === 0) {
      logger.error('沒有健康的 RPC 節點可用');
      return BSC_PUBLIC_RPCS[0]; // 返回默認節點
    }

    return healthyNodes[0].url;
  }

  /**
   * 獲取下一個健康節點（輪詢）
   */
  getNextHealthyNode(): string {
    const healthyNodes = Array.from(this.nodes.values())
      .filter(n => n.isHealthy && n.failureCount < this.MAX_FAILURES);

    if (healthyNodes.length === 0) {
      logger.error('沒有健康的 RPC 節點可用，使用默認節點');
      return BSC_PUBLIC_RPCS[0];
    }

    // 輪詢健康節點
    this.currentIndex = (this.currentIndex + 1) % healthyNodes.length;
    return healthyNodes[this.currentIndex].url;
  }

  /**
   * 報告節點失敗
   */
  reportFailure(url: string) {
    const node = this.nodes.get(url);
    if (node) {
      node.failureCount++;
      node.isHealthy = false;
      logger.warn(`RPC 節點失敗: ${url}, 失敗次數: ${node.failureCount}`);

      // 如果失敗次數過多，暫時禁用
      if (node.failureCount >= this.MAX_FAILURES) {
        logger.error(`RPC 節點已禁用: ${url}`);
      }
    }
  }

  /**
   * 報告節點成功
   */
  reportSuccess(url: string) {
    const node = this.nodes.get(url);
    if (node) {
      node.failureCount = 0;
      node.isHealthy = true;
    }
  }

  /**
   * 獲取節點狀態
   */
  getNodeStats() {
    return Array.from(this.nodes.values()).map(node => ({
      url: node.url,
      latency: node.latency,
      isHealthy: node.isHealthy,
      failureCount: node.failureCount,
      lastCheck: new Date(node.lastCheck).toISOString(),
    }));
  }
}

// 創建單例
export const rpcHealthManager = new RpcHealthManager();

// 禁用自動健康檢查 - 現在只使用 RPC 代理
// if (typeof window !== 'undefined') {
//   rpcHealthManager.startHealthCheck();
// }

/**
 * 智能 RPC 請求包裝器
 */
export async function smartRpcRequest<T>(
  request: (rpcUrl: string) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: any;
  let retriesLeft = maxRetries;

  while (retriesLeft > 0) {
    // 獲取健康的 RPC 節點
    const rpcUrl = rpcHealthManager.getFastestHealthyNode() || BSC_PUBLIC_RPCS[0];

    try {
      logger.debug(`使用 RPC 節點: ${rpcUrl}`);
      const result = await request(rpcUrl);
      
      // 成功，報告節點健康
      rpcHealthManager.reportSuccess(rpcUrl);
      return result;
    } catch (error) {
      logger.warn(`RPC 請求失敗 (剩餘重試: ${retriesLeft - 1}):`, error);
      lastError = error;
      
      // 報告節點失敗
      rpcHealthManager.reportFailure(rpcUrl);
      
      retriesLeft--;
      
      if (retriesLeft > 0) {
        // 短暫延遲後重試
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError;
}