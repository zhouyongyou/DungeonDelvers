// src/config/simpleRpcTransport.ts - 超簡單的私人節點優先 RPC

import { http, type Transport } from 'viem';
import { logger } from '../utils/logger';

/**
 * 超簡單的 RPC 傳輸層
 * 邏輯：有私人節點就用，沒有就用公共節點，不要複雜的容錯機制
 */
export function createSimpleRpcTransport(): Transport {
  
  // 1. 檢查是否有 Alchemy 私人節點
  const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY || 
                     import.meta.env.VITE_ALCHEMY_KEY_PUBLIC;
  
  if (alchemyKey && alchemyKey.length > 20) {
    const privateUrl = `https://bnb-mainnet.g.alchemy.com/v2/${alchemyKey}`;
    logger.info('🔑 使用 Alchemy 私人節點:', alchemyKey.slice(0, 10) + '...');
    
    return http(privateUrl, {
      batch: true,
      timeout: 10000,
      fetchOptions: {
        headers: {
          'User-Agent': 'DungeonDelvers/1.0'
        }
      }
    });
  }
  
  // 2. 沒有私人節點，使用最可靠的公共節點
  const publicUrl = 'https://bsc-dataseed1.binance.org/';
  logger.info('🌐 使用公共 BSC 節點:', publicUrl);
  
  return http(publicUrl, {
    batch: true,
    timeout: 15000,
  });
}

/**
 * 檢查當前 RPC 配置
 */
export function checkCurrentRpcConfig(): void {
  const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY || 
                     import.meta.env.VITE_ALCHEMY_KEY_PUBLIC;
  
  console.log('🔍 簡化 RPC 配置檢查:');
  console.log('- Alchemy Key:', alchemyKey ? '✅ 已配置' : '❌ 未配置');
  console.log('- 使用代理:', import.meta.env.VITE_USE_RPC_PROXY || 'false');
  console.log('- 當前模式:', alchemyKey ? '私人節點' : '公共節點');
  
  if (!alchemyKey) {
    console.log('💡 要使用私人節點，請在 .env.local 中配置 VITE_ALCHEMY_KEY');
  }
}

// 暴露到全局供調試
if (typeof window !== 'undefined') {
  (window as any).checkCurrentRpcConfig = checkCurrentRpcConfig;
}