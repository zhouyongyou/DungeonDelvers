// src/config/wagmiOptimized.ts - 優化的 wagmi 配置

import { createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { createSmartRpcTransport } from './smartRpcTransport';

// 創建優化的 wagmi 配置
// 減少不必要的事件監聽器和 RPC 請求
export const createOptimizedWagmiConfig = () => {
  return createConfig({
    chains: [bsc],
    transports: {
      [bsc.id]: createSmartRpcTransport(),
    },
    // 全局配置選項
    pollingInterval: 30000, // 30秒輪詢一次，減少請求頻率
    syncConnectedChain: true,
    // 批處理配置
    batch: {
      multicall: {
        batchSize: 50, // 批處理大小
        wait: 16, // 等待時間（毫秒）
      },
    },
  });
};

// 管理頁面專用的優化配置
export const adminPageQueryConfig = {
  // 禁用自動事件監聽
  watch: false,
  // 禁用自動刷新
  refetchInterval: false,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  // 長時間緩存
  staleTime: 1000 * 60 * 30, // 30分鐘
  gcTime: 1000 * 60 * 60, // 60分鐘
  // 減少重試
  retry: 1,
  retryDelay: 2000,
};

// 合約讀取優化配置
export const contractReadConfig = {
  // 批量讀取配置
  batchMaxSize: 20,
  batchDebounceMs: 50,
  // 緩存配置
  cacheTime: 1000 * 60 * 10, // 10分鐘
  // 請求去重
  dedupe: true,
};