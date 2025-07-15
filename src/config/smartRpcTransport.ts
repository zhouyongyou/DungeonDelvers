// src/config/smartRpcTransport.ts - 智能 RPC 傳輸層

import { custom, type Transport } from 'viem';
import { rpcHealthManager } from '../utils/rpcHealthCheck';
import { logger } from '../utils/logger';
import { getRpcConfig, buildRpcUrl } from './rpcProxySetup';
import { rpcMonitor } from '../utils/rpcMonitor';

/**
 * 創建智能 RPC 傳輸層
 * 支持自動故障轉移和健康檢查
 */
export function createSmartRpcTransport(): Transport {
  return custom({
    async request({ method, params }) {
      let lastError: any;
      const maxRetries = 3;
      const config = getRpcConfig();
      
      // 開始監控
      const requestId = rpcMonitor.startRequest(
        config.proxyUrl || 'public_rpc',
        method as string,
        params as any[],
        'wagmi_transport',
        'system',
        method as string
      );
      
      // 優先使用 RPC 代理
      if (config.useProxy && config.proxyUrl) {
        try {
          logger.info(`🔐 RPC 請求: ${method} 使用私人節點代理`);
          
          const response = await fetch(config.proxyUrl, {
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
          logger.error('RPC 代理請求失敗:', error);
          lastError = error;
          // 監控失敗
          rpcMonitor.completeRequest(requestId, undefined, error.message);
          
          // 如果是網路錯誤，重試代理而不是回退到公共節點
          if (i < maxRetries - 1) {
            logger.info(`重試 RPC 代理請求 (${i + 2}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 指數退避
            continue;
          }
        }
      }
      
      // 如果代理完全失敗，拋出錯誤而不是使用公共節點
      throw new Error(`RPC 代理請求失敗: ${lastError?.message || '未知錯誤'}`);
      
      /* 移除公共節點回退邏輯 - 完全依賴 RPC 代理 */
    },
    
    retryCount: 3,
    retryDelay: 1000,
    timeout: 10000,
  });
}