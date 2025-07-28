// src/config/rpcProxySetup.ts - RPC 配置（簡化版）

import { logger } from '../utils/logger';

// RPC 配置接口
interface RpcConfig {
  hasAlchemyKey: boolean;
  keyCount: number;
}

/**
 * 獲取 RPC 配置信息
 */
export function getRpcConfig(): RpcConfig {
  // 檢查各種可能的 Alchemy key 配置
  const keys: string[] = [];
  
  // 本地開發環境
  if (import.meta.env.VITE_ALCHEMY_KEY) {
    keys.push(import.meta.env.VITE_ALCHEMY_KEY);
  }
  
  for (let i = 1; i <= 5; i++) {
    const key = import.meta.env[`VITE_ALCHEMY_KEY_${i}`];
    if (key) keys.push(key);
  }
  
  // Vercel 環境
  if (import.meta.env.ALCHEMY_KEY) {
    keys.push(import.meta.env.ALCHEMY_KEY);
  }
  
  for (let i = 1; i <= 5; i++) {
    const key = import.meta.env[`ALCHEMY_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  
  const uniqueKeys = [...new Set(keys)];
  
  // 開發環境提示
  if (import.meta.env.DEV) {
    logger.info('🔧 RPC 配置:', {
      hasAlchemyKey: uniqueKeys.length > 0,
      keyCount: uniqueKeys.length,
    });
  }
  
  return {
    hasAlchemyKey: uniqueKeys.length > 0,
    keyCount: uniqueKeys.length,
  };
}

/**
 * 初始化時檢查配置
 */
export async function initializeRpcConfig(): Promise<void> {
  const config = getRpcConfig();
  
  if (config.hasAlchemyKey) {
    logger.info(`🔐 使用 Alchemy RPC 節點 (共 ${config.keyCount} 個 API key)`);
  } else {
    logger.warn('📡 未配置 Alchemy key，將使用公共 RPC 節點');
    logger.info('💡 建議在環境變數中配置 VITE_ALCHEMY_KEY（本地）或 ALCHEMY_API_KEY_N（生產環境）');
  }
}

// 保留這些導出以保持兼容性
export function checkRpcProxy(): Promise<boolean> {
  logger.warn('checkRpcProxy 已棄用 - RPC 代理功能已移除');
  return Promise.resolve(false);
}

export function buildRpcUrl(): string {
  logger.warn('buildRpcUrl 已棄用 - 請使用 smartRpcTransport');
  return 'https://bsc-dataseed1.binance.org/';
}