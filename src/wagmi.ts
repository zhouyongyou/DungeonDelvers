// src/wagmi.ts (主網專注最終版)

import { http, createConfig, fallback } from 'wagmi';
import { bsc } from 'wagmi/chains';

// =================================================================
// 1. 您的個人化 RPC 節點 URL
//    從 .env.local 檔案讀取，若無則使用公開節點。
// =================================================================
const alchemyMainnetRpc = import.meta.env.VITE_ALCHEMY_BSC_MAINNET_RPC_URL;
const infuraMainnetRpc = import.meta.env.VITE_INFURA_BSC_MAINNET_RPC_URL;
const ankrMainnetRpc = import.meta.env.VITE_ANKR_BSC_MAINNET_RPC_URL;
const publicBscRpc = '[https://bsc-dataseed1.binance.org/](https://bsc-dataseed1.binance.org/)';


// =================================================================
// 2. Wagmi 設定
// ★ 核心優化：
//   - 移除 bscTestnet，使 DApp 完全專注於主網。
//   - 使用 fallback 機制提供多個備用 RPC，增強連線穩定性。
//   - .filter(Boolean) 會自動過濾掉在 .env 中未設定的 RPC URL。
// =================================================================
export const wagmiConfig = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: fallback([
      http(alchemyMainnetRpc),
      http(infuraMainnetRpc),
      http(ankrMainnetRpc),
      http(publicBscRpc), // 將公開節點作為最後的備用選項
    ].filter(Boolean) as any), // 使用 as any 避免類型推斷問題
  },
});