// src/config/smartRpcTransport.ts - 直接 RPC 傳輸層

import { custom, type Transport } from 'viem';
import { logger } from '../utils/logger';
import { rpcMonitor } from '../utils/rpcMonitor';

// 公共 BSC RPC 節點列表（作為後備）
const PUBLIC_BSC_RPCS = [
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/',
  'https://bsc-dataseed3.binance.org/',
  'https://bsc-dataseed4.binance.org/',
];

// 輪換索引
let currentKeyIndex = 0;

/**
 * 獲取所有可用的 Alchemy API keys
 */
function getAlchemyKeys(): string[] {
  const keys: string[] = [];
  
  // 本地開發環境 - 支持單個或多個 key
  if (import.meta.env.VITE_ALCHEMY_KEY) {
    keys.push(import.meta.env.VITE_ALCHEMY_KEY);
  }
  
  // 檢查多個 VITE_ALCHEMY_KEY_N（本地開發）
  for (let i = 1; i <= 5; i++) {
    const key = import.meta.env[`VITE_ALCHEMY_KEY_${i}`];
    if (key) keys.push(key);
  }
  
  // Vercel 環境 - 檢查 ALCHEMY_KEY 和 ALCHEMY_API_KEY_N
  if (import.meta.env.ALCHEMY_KEY) {
    keys.push(import.meta.env.ALCHEMY_KEY);
  }
  
  for (let i = 1; i <= 5; i++) {
    const key = import.meta.env[`ALCHEMY_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  
  // 去重
  return [...new Set(keys)];
}

/**
 * 獲取 RPC URL（支持 key 輪換）
 * 優先使用 Alchemy，否則使用公共節點
 */
function getRpcUrl(): string {
  const alchemyKeys = getAlchemyKeys();
  
  if (alchemyKeys.length > 0) {
    // 使用輪換機制選擇 key
    const key = alchemyKeys[currentKeyIndex % alchemyKeys.length];
    currentKeyIndex++;
    
    logger.info(`🔑 使用 Alchemy RPC 節點 (Key ${(currentKeyIndex - 1) % alchemyKeys.length + 1}/${alchemyKeys.length})`);
    return `https://bnb-mainnet.g.alchemy.com/v2/${key}`;
  }
  
  // 沒有 Alchemy key 時使用公共節點
  logger.warn('⚠️ 未配置 Alchemy key，使用公共 RPC 節點');
  return PUBLIC_BSC_RPCS[0];
}

/**
 * 創建直接 RPC 傳輸層
 * 優先使用 Alchemy，公共節點作為後備
 */
export function createSmartRpcTransport(): Transport {
  const primaryRpcUrl = getRpcUrl();
  const isUsingAlchemy = primaryRpcUrl.includes('alchemy.com');
  
  return custom({
    async request({ method, params }) {
      let lastError: any;
      const maxRetries = isUsingAlchemy ? 3 : 1; // Alchemy 重試 3 次，公共節點不重試
      
      // 開始監控
      const requestId = rpcMonitor.startRequest(
        isUsingAlchemy ? 'alchemy' : 'public_rpc',
        method as string,
        params as any[],
        'wagmi_transport',
        'system',
        method as string
      );
      
      // 嘗試主要 RPC
      for (let i = 0; i < maxRetries; i++) {
        try {
          if (i > 0) {
            logger.info(`🔄 RPC 重試 ${i + 1}/${maxRetries}: ${method}`);
          } else {
            logger.info(`📡 RPC 請求: ${method} 使用 ${isUsingAlchemy ? 'Alchemy' : '公共'}節點`);
          }
          
          const response = await fetch(primaryRpcUrl, {
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
          
          // 監控成功
          rpcMonitor.completeRequest(requestId, data.result);
          
          return data.result;
        } catch (error) {
          logger.error(`RPC 請求失敗 (${isUsingAlchemy ? 'Alchemy' : '公共節點'}):`, error);
          lastError = error;
          
          if (i < maxRetries - 1) {
            // 等待後重試（指數退避）
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }
      
      // 如果使用 Alchemy 失敗，嘗試公共節點作為最後的後備
      if (isUsingAlchemy) {
        logger.warn('⚠️ Alchemy RPC 失敗，嘗試公共節點');
        
        for (const publicRpc of PUBLIC_BSC_RPCS) {
          try {
            const response = await fetch(publicRpc, {
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
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            if (data.error) continue;
            
            // 監控成功（使用公共節點）
            rpcMonitor.completeRequest(requestId, data.result);
            logger.info('✅ 公共節點請求成功');
            
            return data.result;
          } catch (error) {
            logger.error(`公共節點 ${publicRpc} 失敗:`, error);
            continue;
          }
        }
      }
      
      // 監控失敗
      rpcMonitor.completeRequest(requestId, undefined, lastError?.message);
      
      // 所有嘗試都失敗
      throw new Error(`所有 RPC 請求失敗: ${lastError?.message || '未知錯誤'}`);
    },
    
    retryCount: 0, // 我們自己處理重試邏輯
    retryDelay: 1000,
    timeout: 10000,
  });
}