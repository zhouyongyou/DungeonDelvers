// src/wagmi-simple.ts - 超簡單的 wagmi 配置（私人節點優先）

import { createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { createSimpleRpcTransport } from './config/simpleRpcTransport';

/**
 * 簡化版 wagmi 配置
 * - 移除所有複雜的容錯邏輯
 * - 私人節點優先，沒有就用公共節點
 * - 沒有緊急模式、A/B 測試等
 */
export const wagmiSimpleConfig = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: createSimpleRpcTransport(),
  },
  pollingInterval: 30000, // 30 秒輪詢
  syncConnectedChain: false,
  autoConnect: true,
  batch: {
    multicall: {
      wait: 16,
    },
  },
});

// 檢查配置
if (import.meta.env.DEV) {
  console.log('🚀 使用簡化版 wagmi 配置');
  
  // 延遲檢查以確保環境變數載入
  setTimeout(() => {
    const { checkCurrentRpcConfig } = require('./config/simpleRpcTransport');
    checkCurrentRpcConfig();
  }, 1000);
}