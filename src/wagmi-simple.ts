// src/wagmi-simple.ts - 超簡單的 wagmi 配置（私人節點優先）

import { createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { createSimpleRpcTransport } from './config/simpleRpcTransport';

// WalletConnect projectId - 用於 WalletConnect v2
// 如果沒有配置，使用空字串禁用 WalletConnect
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

/**
 * 簡化版 wagmi 配置
 * - 移除所有複雜的容錯邏輯
 * - 私人節點優先，沒有就用公共節點
 * - 沒有緊急模式、A/B 測試等
 */
// 建立連接器列表
const connectors = [
  // MetaMask 和其他注入式錢包（總是可用）
  injected(),
];

// 只有在有 ProjectId 時才添加 WalletConnect
if (walletConnectProjectId) {
  connectors.push(
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
      metadata: {
        name: 'Dungeon Delvers',
        description: 'Blockchain NFT Adventure Game',
        url: 'https://dungeondelvers.com',
        icons: ['https://dungeondelvers.com/favicon.ico'],
      },
    })
  );
}

// Coinbase Wallet（總是可用）
connectors.push(
  coinbaseWallet({
    appName: 'Dungeon Delvers',
  })
);

export const wagmiSimpleConfig = createConfig({
  chains: [bsc],
  connectors,
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
  setTimeout(async () => {
    try {
      const { checkCurrentRpcConfig } = await import('./config/simpleRpcTransport');
      checkCurrentRpcConfig();
    } catch (error) {
      console.warn('無法載入 RPC 配置檢查:', error);
    }
  }, 1000);
}