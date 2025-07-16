// src/config/smartRpcTransport.ts - 混合 RPC 傳輸層

import { custom, type Transport } from 'viem';
import { logger } from '../utils/logger';

// 請求類型分類
export enum RequestType {
  HISTORICAL = 'HISTORICAL',   // 歷史數據，優先使用子圖
  REALTIME = 'REALTIME',      // 實時數據，使用公開節點
  SENSITIVE = 'SENSITIVE',    // 敏感操作，使用代理節點
  BATCH = 'BATCH'            // 批量查詢，使用子圖或代理
}

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
let currentProxyKeyIndex = 0;

/**
 * 分類請求類型
 */
function categorizeRequest(method: string): RequestType {
  // 歷史數據類請求 - 適合子圖
  if (method.includes('getLogs') || 
      method.includes('getBlockByNumber') ||
      method.includes('getTransactionReceipt')) {
    return RequestType.HISTORICAL;
  }
  
  // 敏感操作 - 必須使用代理
  if (method.includes('sendTransaction') || 
      method.includes('sendRawTransaction') ||
      method.includes('personal_')) {
    return RequestType.SENSITIVE;
  }
  
  // 批量查詢 - 優先子圖或代理
  if (method === 'eth_call' && Array.isArray(arguments[1]) && arguments[1].length > 3) {
    return RequestType.BATCH;
  }
  
  // 其他都是實時查詢
  return RequestType.REALTIME;
}

/**
 * 獲取公開的 Alchemy key（可以暴露）
 */
function getPublicAlchemyKey(): string | null {
  // 優先使用專門的公開 key
  if (import.meta.env.VITE_ALCHEMY_KEY_PUBLIC) {
    return import.meta.env.VITE_ALCHEMY_KEY_PUBLIC;
  }
  
  // 向後兼容：使用第一個 key 作為公開 key
  if (import.meta.env.VITE_ALCHEMY_KEY) {
    return import.meta.env.VITE_ALCHEMY_KEY;
  }
  
  if (import.meta.env.VITE_ALCHEMY_KEY_1) {
    return import.meta.env.VITE_ALCHEMY_KEY_1;
  }
  
  return null;
}

/**
 * 獲取需要代理保護的 Alchemy keys
 */
function getProxyAlchemyKeys(): string[] {
  const keys: string[] = [];
  
  // 收集需要保護的 keys (2-5)
  for (let i = 2; i <= 5; i++) {
    // 本地環境變數
    const viteKey = import.meta.env[`VITE_ALCHEMY_KEY_${i}`];
    if (viteKey) keys.push(viteKey);
    
    // Vercel 環境變數
    const vercelKey = import.meta.env[`ALCHEMY_API_KEY_${i}`];
    if (vercelKey) keys.push(vercelKey);
  }
  
  // 去重
  return [...new Set(keys)];
}

/**
 * 根據請求類型獲取合適的 RPC URL
 */
function getRpcUrl(requestType: RequestType): string {
  // 開發環境：優先使用所有可用的 keys
  if (!import.meta.env.PROD) {
    const publicKey = getPublicAlchemyKey();
    if (publicKey && publicKey.length > 20) {
      logger.debug('🔑 開發環境：使用 Alchemy 節點');
      return `https://bnb-mainnet.g.alchemy.com/v2/${publicKey}`;
    }
  }
  
  // 生產環境：根據請求類型選擇
  switch (requestType) {
    case RequestType.HISTORICAL:
    case RequestType.BATCH:
      // 歷史數據和批量查詢優先使用代理（保護流量）
      if (import.meta.env.PROD && getProxyAlchemyKeys().length > 0) {
        logger.debug('🔒 使用 RPC 代理處理批量請求');
        return '/api/rpc';
      }
      break;
      
    case RequestType.SENSITIVE:
      // 敏感操作必須使用代理
      if (import.meta.env.PROD) {
        logger.info('🔐 敏感操作：使用 RPC 代理');
        return '/api/rpc';
      }
      break;
      
    case RequestType.REALTIME:
      // 實時查詢優先使用公開節點
      const publicKey = getPublicAlchemyKey();
      if (publicKey && publicKey.length > 20) {
        logger.debug('⚡ 實時查詢：使用公開 Alchemy 節點');
        return `https://bnb-mainnet.g.alchemy.com/v2/${publicKey}`;
      }
      break;
  }
  
  // 降級到公共節點
  logger.warn('⚠️ 降級使用公共 RPC 節點');
  const rpcIndex = currentKeyIndex++ % PUBLIC_BSC_RPCS.length;
  return PUBLIC_BSC_RPCS[rpcIndex];
}

/**
 * 檢查是否應該使用子圖
 */
function shouldUseSubgraph(method: string, params: any[]): boolean {
  // 管理頁面的批量參數讀取特別適合子圖
  if (method === 'eth_call' && params[0]?.data?.startsWith('0x')) {
    const selector = params[0].data.slice(0, 10);
    // 常見的只讀方法選擇器
    const readOnlySelectors = [
      '0x06fdde03', // name()
      '0x95d89b41', // symbol()
      '0x313ce567', // decimals()
      '0x70a08231', // balanceOf(address)
      '0xdd62ed3e', // allowance(address,address)
      '0x18160ddd', // totalSupply()
    ];
    return readOnlySelectors.includes(selector);
  }
  return false;
}

/**
 * 創建混合 RPC 傳輸層
 * 根據請求類型智能選擇數據源
 */
export function createSmartRpcTransport(): Transport {
  return custom({
    async request({ method, params }) {
      let lastError: any;
      
      // 分類請求類型
      const requestType = categorizeRequest(method as string);
      
      // 檢查是否應該使用子圖（未來實施）
      if (shouldUseSubgraph(method as string, params as any[])) {
        logger.debug('📊 此請求適合使用子圖（待實施）');
        // TODO: 實施子圖查詢邏輯
      }
      
      // 獲取適合的 RPC URL
      const primaryRpcUrl = getRpcUrl(requestType);
      const isUsingProxy = primaryRpcUrl === '/api/rpc';
      const isUsingAlchemy = primaryRpcUrl.includes('alchemy.com') || isUsingProxy;
      const maxRetries = isUsingAlchemy ? 3 : 2;
      
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
        try {
          if (i > 0) {
            logger.info(`🔄 RPC 重試 ${i + 1}/${maxRetries}: ${method}`);
          } else {
            // 只記錄重要的方法，不記錄 filter 相關的頻繁請求
            if (!method.includes('filter') && !method.includes('blockNumber')) {
              const nodeType = isUsingProxy ? '代理' : (isUsingAlchemy ? 'Alchemy' : '公共');
              logger.debug(`📡 RPC 請求: ${method} 使用 ${nodeType}節點`);
            }
          }
          
          // 處理代理路由的相對路徑
          const fetchUrl = isUsingProxy 
            ? `${window.location.origin}${primaryRpcUrl}`
            : primaryRpcUrl;
            
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
            isUsingAlchemy,
            isUsingProxy
          };
          
          logger.error(`RPC 請求失敗 (${isUsingProxy ? '代理' : isUsingAlchemy ? 'Alchemy' : '公共節點'}):`, errorDetails);
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