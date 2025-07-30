// src/config/smartRpcTransport.ts - 直接 RPC 傳輸層

import { custom, type Transport } from 'viem';
import { logger } from '../utils/logger';
import { getRpcEndpoint } from '../utils/rpcOptimizedMigration';
import { 
  shouldActivateEmergencyMode, 
  activateEmergencyMode, 
  getEmergencyRpcUrl, 
  isEmergencyModeActive,
  findFastestEmergencyRpc 
} from './emergencyRpcFallback';
// import { rpcMonitor } from '../utils/rpcMonitor'; // Removed RPC monitoring

// 公共 BSC RPC 節點列表（作為後備）- 移除有問題的節點
const PUBLIC_BSC_RPCS = [
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/',
  'https://bsc-dataseed3.binance.org/',
  'https://bsc-dataseed4.binance.org/',
  // 'https://bsc.publicnode.com', // 移除：ERR_CONNECTION_CLOSED
  'https://1rpc.io/bnb',
  'https://binance.nodereal.io',
  // 'https://bsc-rpc.gateway.pokt.network', // 移除：ERR_NAME_NOT_RESOLVED
];

// 輪換索引
let currentKeyIndex = 0;

// 記錄最後使用的 key 索引，避免重複日誌
let lastLoggedKeyIndex = -1;
let lastLogTime = 0;
const LOG_THROTTLE_MS = 30000; // 30 秒內不重複記錄相同 key

/**
 * 緊急 RPC 請求函數
 */
async function makeEmergencyRpcRequest(method: string, params: any[]): Promise<any> {
  logger.info('🆘 使用緊急 RPC 執行請求:', method);
  
  // 嘗試最多 3 個緊急節點
  for (let i = 0; i < 3; i++) {
    const emergencyRpc = getEmergencyRpcUrl();
    
    try {
      const response = await fetch(emergencyRpc, {
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
        throw new Error(data.error.message || 'RPC error');
      }
      
      logger.info('✅ 緊急 RPC 請求成功');
      return data.result;
      
    } catch (error) {
      logger.warn(`緊急 RPC 嘗試 ${i + 1}/3 失敗:`, error);
      
      if (i === 2) {
        throw new Error(`所有緊急 RPC 嘗試都失敗: ${error.message}`);
      }
    }
  }
}

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
 * 檢查是否為管理員頁面（需要穩定 RPC）
 */
function isCurrentlyAdminPage(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hash?.includes('admin') || false;
}

/**
 * 獲取 RPC URL
 * 根據環境配置決定使用策略：
 * 1. 如果配置了 VITE_USE_RPC_PROXY=true，使用 Vercel API 代理
 * 2. 管理頁面可單獨配置 VITE_ADMIN_USE_VERCEL_PROXY
 * 3. 如果有 Alchemy key，直接使用
 * 4. 否則使用公共節點
 */
function getRpcUrl(): string {
  // 檢查是否應該使用 RPC 代理
  const globalUseProxy = import.meta.env.VITE_USE_RPC_PROXY === 'true';
  const adminUseProxy = import.meta.env.VITE_ADMIN_USE_VERCEL_PROXY === 'true';
  
  // 管理頁面專用邏輯
  if (isCurrentlyAdminPage()) {
    const shouldUseProxy = adminUseProxy || globalUseProxy;
    
    if (shouldUseProxy) {
      const rpcEndpoint = getRpcEndpoint();
      const isExternal = rpcEndpoint.startsWith('http');
      logger.info(`🛡️ 管理頁面：使用${isExternal ? '線上' : '本地'} Vercel 代理 ${rpcEndpoint}`);
      return rpcEndpoint;
    } else {
      logger.info(`🔧 管理頁面：使用直接 Alchemy 連接`);
      // 繼續使用下面的邏輯
    }
  }
  
  // 全域 RPC 代理設定
  if (globalUseProxy) {
    const rpcEndpoint = getRpcEndpoint();
    const isExternal = rpcEndpoint.startsWith('http');
    logger.info(`🔒 使用${isExternal ? '線上' : '本地'} Vercel RPC 代理：${rpcEndpoint}`);
    return rpcEndpoint;
  }
  
  // 未啟用代理時的備用邏輯 - 使用直接 Alchemy 連接
  const alchemyKeys = getAlchemyKeys();
  
  logger.debug('RPC 配置:', { 
    alchemyKeysCount: alchemyKeys.length,
    alchemyKeys: alchemyKeys.map(k => k ? `${k.substring(0, 10)}...` : 'undefined')
  });
  
  if (alchemyKeys.length > 0) {
    // 驗證 key 的完整性
    const key = alchemyKeys[currentKeyIndex % alchemyKeys.length];
    if (key && key.length > 20) {
      currentKeyIndex++;
      
      logger.info(`🔑 使用直接 Alchemy RPC 節點 (Key ${(currentKeyIndex - 1) % alchemyKeys.length + 1}/${alchemyKeys.length})`);
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
      
      // 檢查是否應該使用 RPC 代理
      const globalUseProxy = import.meta.env.VITE_USE_RPC_PROXY === 'true';
      const adminUseProxy = import.meta.env.VITE_ADMIN_USE_VERCEL_PROXY === 'true';
      
      // 全域或管理頁面專用代理檢查
      const shouldUseProxy = globalUseProxy || 
                            (isCurrentlyAdminPage() && adminUseProxy);
      
      if (shouldUseProxy && !isEmergencyModeActive()) {
          try {
            const proxyUrl = getRpcEndpoint();
            
            const response = await fetch(proxyUrl, {
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
              throw new Error(data.error.message || 'RPC error');
            }
            
            return data.result;
          } catch (error) {
            logger.error(`Vercel RPC 代理請求失敗:`, {
              error: error.message,
              method,
              endpoint: getRpcEndpoint(),
              isAdminPage: isCurrentlyAdminPage()
            });
            
            // 檢查是否應該啟用緊急模式
            if (shouldActivateEmergencyMode(error)) {
              logger.warn('🚨 檢測到 RPC 代理連接問題，啟用緊急模式');
              activateEmergencyMode();
              
              // 使用緊急 RPC 重試請求
              return await makeEmergencyRpcRequest(method, params);
            }
            
            throw error;
          }
      }
      
      // 如果已經在緊急模式，直接使用緊急 RPC
      if (isEmergencyModeActive()) {
        return await makeEmergencyRpcRequest(method, params);
      }
      
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