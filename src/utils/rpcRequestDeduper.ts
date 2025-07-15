// src/utils/rpcRequestDeduper.ts - RPC 請求去重工具

import { logger } from './logger';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  count: number;
}

class RpcRequestDeduper {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestTimeout = 5000; // 5秒超時
  
  /**
   * 生成請求的唯一鍵
   */
  private generateKey(method: string, params: any[]): string {
    return `${method}:${JSON.stringify(params)}`;
  }
  
  /**
   * 清理過期的請求
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    this.pendingRequests.forEach((request, key) => {
      if (now - request.timestamp > this.requestTimeout) {
        expired.push(key);
      }
    });
    
    expired.forEach(key => {
      this.pendingRequests.delete(key);
      logger.debug(`清理過期的 RPC 請求: ${key}`);
    });
  }
  
  /**
   * 執行去重的請求
   */
  async dedupedRequest<T>(
    method: string,
    params: any[],
    requestFn: () => Promise<T>
  ): Promise<T> {
    // 清理過期請求
    this.cleanupExpiredRequests();
    
    const key = this.generateKey(method, params);
    const existing = this.pendingRequests.get(key);
    
    if (existing) {
      // 如果有相同的請求正在進行，返回現有的 Promise
      existing.count++;
      logger.debug(`重用現有 RPC 請求 (${existing.count} 次): ${key}`);
      return existing.promise;
    }
    
    // 創建新請求
    const promise = requestFn()
      .then(result => {
        this.pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });
    
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      count: 1,
    });
    
    return promise;
  }
  
  /**
   * 獲取當前待處理的請求數
   */
  getPendingCount(): number {
    this.cleanupExpiredRequests();
    return this.pendingRequests.size;
  }
  
  /**
   * 獲取請求統計
   */
  getStats(): {
    pendingCount: number;
    dedupedRequests: Array<{
      key: string;
      count: number;
      age: number;
    }>;
  } {
    this.cleanupExpiredRequests();
    const now = Date.now();
    
    const dedupedRequests = Array.from(this.pendingRequests.entries()).map(([key, request]) => ({
      key,
      count: request.count,
      age: now - request.timestamp,
    }));
    
    return {
      pendingCount: this.pendingRequests.size,
      dedupedRequests,
    };
  }
  
  /**
   * 清除所有待處理的請求
   */
  clear(): void {
    this.pendingRequests.clear();
    logger.info('已清除所有待處理的 RPC 請求');
  }
}

// 創建全局實例
export const rpcRequestDeduper = new RpcRequestDeduper();

// 在開發環境下定期輸出統計
if (import.meta.env.DEV) {
  setInterval(() => {
    const stats = rpcRequestDeduper.getStats();
    if (stats.pendingCount > 0) {
      logger.debug('RPC 請求去重統計:', stats);
    }
  }, 10000); // 每10秒
}