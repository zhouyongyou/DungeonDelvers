// src/wagmi.ts (直接 Alchemy RPC 版本)

import { createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { createSmartRpcTransport } from './config/smartRpcTransport';

// 檢查是否為管理員頁面
const isAdminPage = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hash.includes('admin');
};

// 使用直接 RPC 傳輸層
export const wagmiConfig = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: createSmartRpcTransport(),
  },
  // 全域禁用自動監聽以減少 RPC 請求
  pollingInterval: isAdminPage() ? 0 : 60000, // 管理員頁面完全禁用輪詢
  syncConnectedChain: false, // 禁用鏈同步
  // 禁用自動 watch 功能
  autoConnect: true,
  batch: {
    multicall: {
      wait: 32, // 批次請求等待時間
    },
  },
});
