// src/config/rpc.ts - 安全的 RPC 配置

import { logger } from '../utils/logger';

/**
 * BSC 公共 RPC 節點列表
 * 這些是免費且安全的公共節點，不需要 API Key
 */
export const BSC_PUBLIC_RPCS = [
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/', 
  'https://bsc-dataseed3.binance.org/',
  'https://bsc-dataseed4.binance.org/',
  'https://binance.llamarpc.com',
  'https://rpc.ankr.com/bsc',
] as const;

/**
 * 獲取 RPC URL
 * 優先使用後端代理，其次使用公共節點
 */
export function getRpcUrl(): string {
  // 檢查是否啟用 RPC 代理
  const useProxy = import.meta.env.VITE_USE_RPC_PROXY === 'true';
  const metadataServer = import.meta.env.VITE_METADATA_SERVER_URL;
  
  if (useProxy && metadataServer) {
    logger.info('🔄 使用後端 RPC 代理:', metadataServer);
    return `${metadataServer}/api/rpc`;
  }

  // 檢查是否有不安全的 Alchemy URL（應該移除）
  const alchemyUrl = import.meta.env.VITE_ALCHEMY_BSC_MAINNET_RPC_URL;
  if (alchemyUrl) {
    logger.warn('⚠️ 警告：檢測到前端使用私有 RPC URL，這是不安全的！請參考 RPC_SECURITY_GUIDE.md');
    // 暫時返回，但應該盡快移除
    return alchemyUrl;
  }

  // 使用公共 RPC 節點
  return getPublicRpc();
}

/**
 * 輪詢策略：分散請求到不同的公共節點
 */
let currentRpcIndex = 0;

export function getPublicRpc(): string {
  const rpc = BSC_PUBLIC_RPCS[currentRpcIndex];
  currentRpcIndex = (currentRpcIndex + 1) % BSC_PUBLIC_RPCS.length;
  logger.debug('使用公共 RPC:', rpc);
  return rpc;
}

/**
 * 測試 RPC 連接
 */
export async function testRpcConnection(rpcUrl: string): Promise<boolean> {
  try {
    // 如果是後端代理，使用代理專用的測試方法
    if (rpcUrl.includes('/api/rpc')) {
      const response = await fetch(rpcUrl.replace('/api/rpc', '/api/rpc/status'));
      const data = await response.json();
      return data.summary?.healthy > 0;
    }
    
    // 直接 RPC 測試
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });
    
    const data = await response.json();
    return !!data.result;
  } catch (error) {
    logger.error('RPC 連接測試失敗:', error);
    return false;
  }
}

/**
 * 獲取最快的 RPC 節點
 */
export async function getFastestRpc(): Promise<string> {
  const tests = BSC_PUBLIC_RPCS.map(async (rpc) => {
    const start = Date.now();
    const success = await testRpcConnection(rpc);
    const time = Date.now() - start;
    return { rpc, success, time };
  });

  const results = await Promise.all(tests);
  const validResults = results.filter(r => r.success);
  
  if (validResults.length === 0) {
    logger.error('所有 RPC 節點都無法連接');
    return BSC_PUBLIC_RPCS[0]; // 返回默認值
  }

  // 按響應時間排序
  validResults.sort((a, b) => a.time - b.time);
  const fastest = validResults[0];
  
  logger.info(`最快的 RPC: ${fastest.rpc} (${fastest.time}ms)`);
  return fastest.rpc;
}

/**
 * RPC 請求重試邏輯
 */
export async function rpcRequestWithRetry(
  request: () => Promise<any>,
  maxRetries = 3
): Promise<any> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await request();
    } catch (error) {
      logger.warn(`RPC 請求失敗 (嘗試 ${i + 1}/${maxRetries}):`, error);
      lastError = error;
      
      // 如果不是最後一次嘗試，切換到下一個 RPC
      if (i < maxRetries - 1) {
        getPublicRpc(); // 切換 RPC
      }
    }
  }
  
  throw lastError;
}