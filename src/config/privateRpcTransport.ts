// src/config/privateRpcTransport.ts - 簡化的私人節點 RPC 傳輸層

import { custom, type Transport } from 'viem';
import { logger } from '../utils/logger';
import { getCurrentRPC, reportRPCFailure } from './rpc-manager';

/**
 * 創建智能 Alchemy RPC 傳輸層
 * 支援自動故障轉移和負載均衡
 */
export function createPrivateRpcTransport(): Transport {
  
  return custom({
    async request({ method, params }) {
      try {
        const rpcUrl = getCurrentRPC();
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
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          // 處理速率限制
          if (data.error.code === -32005 || data.error.message?.includes('rate limit')) {
            logger.warn('⚠️ RPC 速率限制，請稍後再試');
          }
          throw new Error(data.error.message || 'RPC error');
        }
        
        return data.result;
      } catch (error) {
        // 報告 RPC 失敗，觸發自動切換
        reportRPCFailure();
        
        logger.error('RPC 請求失敗:', {
          method,
          error: error.message,
          currentRPC: getCurrentRPC().includes('alchemy') ? 'Alchemy' : 'Public'
        });
        throw error;
      }
    },
    
    retryCount: 3,
    retryDelay: 1000,
    timeout: 10000,
  });
}

// 導出為 createSmartRpcTransport 以兼容現有代碼
export const createSmartRpcTransport = createPrivateRpcTransport;