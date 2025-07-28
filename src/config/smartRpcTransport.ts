// src/config/smartRpcTransport.ts - 直接 RPC 傳輸層

import { custom, type Transport } from 'viem';
import { logger } from '../utils/logger';
import { getRpcEndpoint } from '../utils/rpcOptimizedMigration';
// import { rpcMonitor } from '../utils/rpcMonitor'; // Removed RPC monitoring

// 公共 BSC RPC 節點列表（作為後備）
const PUBLIC_BSC_RPCS = [
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/',
  'https://bsc-dataseed3.binance.org/',
  'https://bsc-dataseed4.binance.org/',
  'https://rpc.ankr.com/bsc',
  'https://bsc-rpc.publicnode.com',
];

// 輪換索引
let currentKeyIndex = 0;

// 記錄最後使用的 key 索引，避免重複日誌
let lastLoggedKeyIndex = -1;
let lastLogTime = 0;
const LOG_THROTTLE_MS = 30000; // 30 秒內不重複記錄相同 key

/**
 * 獲取所有可用的 Alchemy API keys
 */
function getAlchemyKeys(): string[] {
  const keys: string[] = [];
  
  // 本地開發環境 - 支持單個或多個 key
  if (import.meta.env.VITE_ALCHEMY_KEY) {
    keys.push(import.meta.env.VITE_ALCHEMY_KEY);
  }
  
  // 混合策略：直接暴露的 public key（優先使用）
  if (import.meta.env.VITE_ALCHEMY_KEY_PUBLIC) {
    keys.push(import.meta.env.VITE_ALCHEMY_KEY_PUBLIC);
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
 * 獲取 RPC URL
 * 根據環境配置決定使用策略：
 * 1. 如果配置了 VITE_USE_RPC_PROXY=true，使用 API 代理
 * 2. 如果有 Alchemy key，直接使用
 * 3. 否則使用公共節點
 */
function getRpcUrl(): string {
  // 使用新的 RPC 代理遷移策略
  const useRpcProxy = import.meta.env.VITE_USE_RPC_PROXY === 'true';
  
  // 生產環境且啟用代理
  if (import.meta.env.PROD && useRpcProxy) {
    const rpcEndpoint = getRpcEndpoint();
    logger.info(`🔒 生產環境：使用 ${rpcEndpoint}`);
    return rpcEndpoint;
  }
  
  // 生產環境但未啟用代理 - 使用直接 Alchemy 連接
  if (import.meta.env.PROD && !useRpcProxy) {
    // 繼續使用現有的直接連接邏輯
    const alchemyKeys = getAlchemyKeys();
    if (alchemyKeys.length > 0) {
      const key = alchemyKeys[currentKeyIndex++ % alchemyKeys.length];
      return `https://bnb-mainnet.g.alchemy.com/v2/${key}`;
    }
    // 如果沒有 key，使用公共節點
    logger.warn('🚨 緊急模式：生產環境使用公共 RPC 節點');
    const rpcIndex = currentKeyIndex++ % PUBLIC_BSC_RPCS.length;
    return PUBLIC_BSC_RPCS[rpcIndex];
  }
  
  // 檢查本地 Alchemy key（開發環境或未啟用代理的生產環境）
  const alchemyKeys = getAlchemyKeys();
  
  logger.debug('開發環境 RPC 配置:', { 
    alchemyKeysCount: alchemyKeys.length,
    alchemyKeys: alchemyKeys.map(k => k ? `${k.substring(0, 10)}...` : 'undefined')
  });
  
  if (alchemyKeys.length > 0) {
    // 驗證 key 的完整性
    const key = alchemyKeys[currentKeyIndex % alchemyKeys.length];
    if (key && key.length > 20) {
      currentKeyIndex++;
      
      logger.info(`🔑 使用本地 Alchemy RPC 節點 (Key ${(currentKeyIndex - 1) % alchemyKeys.length + 1}/${alchemyKeys.length})`);
      return `https://bnb-mainnet.g.alchemy.com/v2/${key}`;
    } else {
      logger.warn('⚠️ Alchemy key 不完整，使用公共 RPC 節點');
    }
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
  // 保存所有可用的 Alchemy keys
  const alchemyKeys = getAlchemyKeys();
  let keyRotationIndex = 0;
  
  return custom({
    async request({ method, params }) {
      let lastError: any;
      
      // 每次請求時輪換使用不同的 key
      const useAlchemyKeys = alchemyKeys.length > 0;
      const maxRetries = useAlchemyKeys ? 3 : 2; // Alchemy 重試 3 次，公共節點重試 2 次
      
      // RPC monitoring disabled
      // const requestId = rpcMonitor.startRequest(
      //   isUsingAlchemy ? 'alchemy' : 'public_rpc',
      //   method as string,
      //   params as any[],
      //   'wagmi_transport',
      //   'system',
      //   method as string
      // );
      
      // 嘗試主要 RPC
      for (let i = 0; i < maxRetries; i++) {
        // 動態獲取 RPC URL，實現 key 輪換
        let primaryRpcUrl: string;
        
        if (useAlchemyKeys) {
          // 輪換使用不同的 Alchemy key
          const keyIndex = (keyRotationIndex + i) % alchemyKeys.length;
          const key = alchemyKeys[keyIndex];
          primaryRpcUrl = `https://bnb-mainnet.g.alchemy.com/v2/${key}`;
          
          // 智能日誌：只在 key 切換或超過節流時間時記錄
          if (i === 0) {
            const now = Date.now();
            const shouldLog = keyIndex !== lastLoggedKeyIndex || 
                             (now - lastLogTime) > LOG_THROTTLE_MS;
            
            if (shouldLog) {
              logger.info(`🔑 使用 Alchemy Key ${keyIndex + 1}/${alchemyKeys.length}`);
              lastLoggedKeyIndex = keyIndex;
              lastLogTime = now;
            }
          }
        } else {
          // 使用公共節點
          primaryRpcUrl = PUBLIC_BSC_RPCS[i % PUBLIC_BSC_RPCS.length];
        }
        
        const fetchUrl = primaryRpcUrl;
          
        try {
          if (i > 0) {
            logger.info(`🔄 RPC 重試 ${i + 1}/${maxRetries}: ${method}`);
          } else {
            // 只記錄重要的方法，不記錄 filter 相關的頻繁請求
            if (!method.includes('filter') && !method.includes('blockNumber')) {
              const nodeType = useAlchemyKeys ? 'Alchemy' : '公共';
              logger.debug(`📡 RPC 請求: ${method} 使用 ${nodeType}節點`);
            }
          }
            
          const response = await fetch(fetchUrl, {
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
          
          // RPC monitoring disabled
          // rpcMonitor.completeRequest(requestId, data.result);
          
          return data.result;
        } catch (error) {
          const errorDetails = {
            message: error.message,
            url: fetchUrl,
            method,
            attempt: i + 1,
            maxRetries,
            isUsingAlchemy: useAlchemyKeys
          };
          
          logger.error(`RPC 請求失敗 (${useAlchemyKeys ? 'Alchemy' : '公共節點'}):`, errorDetails);
          lastError = error;
          
          if (i < maxRetries - 1) {
            // 等待後重試（指數退避）
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }
      
      // 每次請求完成後，增加 key 輪換索引
      if (useAlchemyKeys) {
        keyRotationIndex = (keyRotationIndex + 1) % alchemyKeys.length;
      }
      
      // 如果使用 Alchemy 失敗，嘗試公共節點作為最後的後備
      if (useAlchemyKeys) {
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
            
            // RPC monitoring disabled
            // rpcMonitor.completeRequest(requestId, data.result);
            logger.info('✅ 公共節點請求成功');
            
            return data.result;
          } catch (error) {
            logger.error(`公共節點 ${publicRpc} 失敗:`, error);
            continue;
          }
        }
      }
      
      // RPC monitoring disabled
      // rpcMonitor.completeRequest(requestId, undefined, lastError?.message);
      
      // 所有嘗試都失敗
      throw new Error(`所有 RPC 請求失敗: ${lastError?.message || '未知錯誤'}`);
    },
    
    retryCount: 0, // 我們自己處理重試邏輯
    retryDelay: 1000,
    timeout: 10000,
  });
}