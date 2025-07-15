// src/config/smartRpcTransport.ts - 智能 RPC 傳輸層

import { custom, type Transport } from 'viem';
import { rpcHealthManager } from '../utils/rpcHealthCheck';
import { logger } from '../utils/logger';

/**
 * 創建智能 RPC 傳輸層
 * 支持自動故障轉移和健康檢查
 */
export function createSmartRpcTransport(): Transport {
  return custom({
    async request({ method, params }) {
      let lastError: any;
      const maxRetries = 3;
      
      for (let i = 0; i < maxRetries; i++) {
        // 獲取最快的健康節點
        const rpcUrl = rpcHealthManager.getFastestHealthyNode();
        
        if (!rpcUrl) {
          throw new Error('沒有可用的 RPC 節點');
        }
        
        try {
          logger.debug(`RPC 請求: ${method} 使用節點: ${rpcUrl}`);
          
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method,
              params,
              id: Date.now(),
            }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error.message || 'RPC error');
          }
          
          // 成功，報告節點健康
          rpcHealthManager.reportSuccess(rpcUrl);
          
          return data.result;
        } catch (error) {
          logger.warn(`RPC 請求失敗 (嘗試 ${i + 1}/${maxRetries}):`, error);
          lastError = error;
          
          // 報告節點失敗
          rpcHealthManager.reportFailure(rpcUrl);
          
          // 如果還有重試機會，短暫延遲
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      throw lastError || new Error('RPC 請求失敗');
    },
    
    retryCount: 3,
    retryDelay: 1000,
    timeout: 10000,
  });
}