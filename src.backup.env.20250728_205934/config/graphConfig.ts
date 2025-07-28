// graphConfig.ts - 集中管理 The Graph 配置

import { ENV } from './env';

// 使用統一的環境配置
export const THE_GRAPH_API_URL = ENV.THE_GRAPH.API_URL;

// 顯示當前使用的版本（開發環境）
if (import.meta.env.DEV) {
  console.log(`[The Graph] Using ${ENV.THE_GRAPH.USE_DECENTRALIZED ? 'Decentralized Network' : 'Studio'} version`);
  if (!THE_GRAPH_API_URL) {
    console.warn('[The Graph] No API URL configured!');
  }
}

// 輸出配置信息
export const graphConfig = {
  url: THE_GRAPH_API_URL,
  isDecentralized: ENV.THE_GRAPH.USE_DECENTRALIZED,
  // 去中心化版本的特殊配置
  networkConfig: ENV.THE_GRAPH.USE_DECENTRALIZED ? {
    // 可以在這裡添加更多去中心化網路的配置
    timeout: 30000, // 30秒超時
    retryAttempts: 3,
  } : {
    // Studio 版本的配置
    timeout: 10000, // 10秒超時
    retryAttempts: 2,
  }
};

// 用於檢查 API Key 是否已配置
export const isGraphConfigured = () => {
  if (!THE_GRAPH_API_URL) return false;
  
  if (ENV.THE_GRAPH.USE_DECENTRALIZED) {
    // 檢查是否包含 API Key
    const hasApiKey = THE_GRAPH_API_URL.includes('/api/') && 
                      !THE_GRAPH_API_URL.includes('[YOUR-API-KEY]') &&
                      !THE_GRAPH_API_URL.includes('YOUR_API_KEY');
    
    if (!hasApiKey) {
      console.error('[The Graph] 去中心化網路需要有效的 API Key！');
      console.error('[The Graph] 請前往 https://thegraph.com/studio/apikeys/ 獲取 API Key');
    }
    
    return hasApiKey;
  }
  
  return true;
};