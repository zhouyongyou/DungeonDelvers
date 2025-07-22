// graphConfig.ts - 集中管理 The Graph 配置

// 檢查是否使用去中心化版本
const useDecentralized = import.meta.env.VITE_USE_DECENTRALIZED_GRAPH === 'true';

// 根據配置選擇 URL
export const THE_GRAPH_API_URL = useDecentralized
  ? import.meta.env.VITE_THE_GRAPH_NETWORK_URL
  : (import.meta.env.VITE_THE_GRAPH_API_URL || 
     import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL || 
     import.meta.env.VITE_THEGRAPH_API_URL);

// 顯示當前使用的版本（開發環境）
if (import.meta.env.DEV) {
  console.log(`[The Graph] Using ${useDecentralized ? 'Decentralized Network' : 'Studio'} version`);
  if (!THE_GRAPH_API_URL) {
    console.warn('[The Graph] No API URL configured!');
  }
}

// 輸出配置信息
export const graphConfig = {
  url: THE_GRAPH_API_URL,
  isDecentralized: useDecentralized,
  // 去中心化版本的特殊配置
  networkConfig: useDecentralized ? {
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
  
  if (useDecentralized) {
    // 檢查是否包含 API Key
    return THE_GRAPH_API_URL.includes('/api/') && !THE_GRAPH_API_URL.includes('[YOUR-API-KEY]');
  }
  
  return true;
};