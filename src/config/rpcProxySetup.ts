// src/config/rpcProxySetup.ts - RPC 代理設置

import { logger } from '../utils/logger';

// RPC 配置接口
interface RpcConfig {
  useProxy: boolean;
  proxyUrl?: string;
  alchemyKey?: string;
  fallbackToPublic: boolean;
}

// 獲取 RPC 配置
export function getRpcConfig(): RpcConfig {
  const useProxy = import.meta.env.VITE_USE_RPC_PROXY === 'true';
  const metadataServer = import.meta.env.VITE_METADATA_SERVER_URL || import.meta.env.VITE_SERVER_URL;
  const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY;
  
  // 開發環境提示
  if (import.meta.env.DEV) {
    logger.info('🔧 RPC 配置:', {
      useProxy,
      metadataServer,
      hasAlchemyKey: !!alchemyKey,
    });
  }
  
  return {
    useProxy,
    proxyUrl: useProxy && metadataServer ? `${metadataServer}/api/rpc` : undefined,
    alchemyKey,
    fallbackToPublic: true,
  };
}

// 檢查後端代理是否可用
export async function checkRpcProxy(): Promise<boolean> {
  const config = getRpcConfig();
  
  if (!config.useProxy || !config.proxyUrl) {
    logger.warn('RPC 代理未啟用或未配置');
    return false;
  }
  
  try {
    const response = await fetch(config.proxyUrl.replace('/api/rpc', '/api/rpc/status'), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      logger.error('RPC 代理狀態檢查失敗:', response.status);
      return false;
    }
    
    const data = await response.json();
    // 更新健康檢查邏輯 - 檢查是否有活躍節點
    const hasActiveNodes = data.nodes?.some((node: any) => node.status === 'active');
    const isProxyEnabled = data.proxyEnabled === true;
    const isHealthy = isProxyEnabled && hasActiveNodes;
    
    if (isHealthy) {
      logger.info('✅ RPC 代理健康狀態良好', {
        activeNodes: data.nodes?.filter((n: any) => n.status === 'active').length,
        total: data.summary?.total
      });
    } else {
      logger.warn('⚠️ RPC 代理狀態異常', data);
    }
    
    return isHealthy;
  } catch (error) {
    logger.error('RPC 代理連接失敗:', error);
    return false;
  }
}

// 初始化時檢查配置
export async function initializeRpcConfig(): Promise<void> {
  const config = getRpcConfig();
  
  if (config.useProxy) {
    logger.info('🔐 正在使用後端 RPC 代理模式');
    
    // 檢查代理健康狀態
    const isHealthy = await checkRpcProxy();
    
    if (!isHealthy && config.fallbackToPublic) {
      logger.warn('⚠️ RPC 代理不可用，將使用公共節點作為備份');
    }
  } else {
    logger.info('📡 使用公共 RPC 節點模式');
    
    // 檢查是否有未受保護的 API key
    if (config.alchemyKey) {
      logger.error('🚨 安全警告：在前端發現 Alchemy API key！');
      logger.error('🔐 請移除前端的 VITE_ALCHEMY_KEY 並使用後端代理');
    }
  }
}

// 構建 RPC 請求 URL
export function buildRpcUrl(): string {
  const config = getRpcConfig();
  
  if (config.useProxy && config.proxyUrl) {
    return config.proxyUrl;
  }
  
  // 如果有 Alchemy key（不推薦）
  if (config.alchemyKey) {
    logger.warn('⚠️ 使用前端 Alchemy key（不安全）');
    return `https://bnb-mainnet.g.alchemy.com/v2/${config.alchemyKey}`;
  }
  
  // 返回公共節點
  return 'https://bsc-dataseed1.binance.org/';
}