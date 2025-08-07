// src/config/privateRpcTransport.ts - 簡化的私人節點 RPC 傳輸層

import { custom, type Transport } from 'viem';
import { logger } from '../utils/logger';

/**
 * 獲取 RPC URL
 * 優先順序：
 * 1. 私人節點（如果配置）
 * 2. Alchemy 節點（必須有，否則報錯）
 */
function getRpcUrl(): string {
  // 1. 檢查私人節點配置
  if (import.meta.env.VITE_PRIVATE_RPC_URL) {
    logger.info('🔐 使用私人 RPC 節點');
    return import.meta.env.VITE_PRIVATE_RPC_URL;
  }
  
  // 2. 使用 Alchemy（必須配置）
  const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY || 
                    import.meta.env.VITE_ALCHEMY_KEY_PUBLIC ||
                    'tiPlQVTwx4_2P98Pl7hb-LfzaTyi5HOn';
  
  if (!alchemyKey) {
    // 不再使用公共節點，直接報錯
    throw new Error('❌ 必須配置 Alchemy API Key 或私人 RPC 節點！請在 .env 中設置 VITE_ALCHEMY_KEY 或 VITE_PRIVATE_RPC_URL');
  }
  
  logger.info('🔑 使用 Alchemy RPC 節點');
  return `https://bnb-mainnet.g.alchemy.com/v2/${alchemyKey}`;
}

/**
 * 創建簡化的私人節點 RPC 傳輸層
 * 移除所有 thirdweb 和複雜的 fallback 邏輯
 */
export function createPrivateRpcTransport(): Transport {
  const rpcUrl = getRpcUrl();
  
  return custom({
    async request({ method, params }) {
      try {
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
        logger.error('RPC 請求失敗:', {
          method,
          error: error.message,
          rpcUrl: rpcUrl.includes('alchemy') ? 'Alchemy' : 'Private'
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