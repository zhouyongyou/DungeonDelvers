// src/wagmi.ts (主網專注版)

import { http, createConfig, fallback } from 'wagmi';
import { bsc } from 'wagmi/chains';

// =================================================================
// 1. 您的個人化 RPC 節點 URL
// =================================================================
const alchemyMainnetRpc = import.meta.env.VITE_ALCHEMY_BSC_MAINNET_RPC_URL || '[https://bsc-dataseed1.binance.org/](https://bsc-dataseed1.binance.org/)';
const infuraMainnetRpc = import.meta.env.VITE_INFURA_BSC_MAINNET_RPC_URL;
const ankrMainnetRpc = import.meta.env.VITE_ANKR_BSC_MAINNET_RPC_URL;


// =================================================================
// 2. Wagmi 設定
// ★ 核心修正：已移除 bscTestnet，只設定主網
// =================================================================
export const wagmiConfig = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: fallback([
      http(alchemyMainnetRpc),
      http(infuraMainnetRpc),
      http(ankrMainnetRpc),
    ].filter(Boolean)),
  },
});

// import { http, createConfig, fallback } from 'wagmi';
// import { bsc, bscTestnet } from 'wagmi/chains';

// // =================================================================
// // 1. 您的個人化 RPC 節點 URL
// // =================================================================
// // 建議將這些 URL 存放在 .env.local 檔案中，以保護您的 API 金鑰。
// // 程式會優先讀取 .env.local 中的變數。如果讀取不到，則會使用一個公開的、有速率限制的節點作為備用。

// // 主要節點 (推薦使用 Alchemy)
// const alchemyMainnetRpc = import.meta.env.VITE_ALCHEMY_BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org/';
// const alchemyTestnetRpc = import.meta.env.VITE_ALCHEMY_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';

// // 備用節點 (可選)
// const infuraMainnetRpc = import.meta.env.VITE_INFURA_BSC_MAINNET_RPC_URL;
// const infuraTestnetRpc = import.meta.env.VITE_INFURA_BSC_TESTNET_RPC_URL;
// const ankrMainnetRpc = import.meta.env.VITE_ANKR_BSC_MAINNET_RPC_URL;
// const ankrTestnetRpc = import.meta.env.VITE_ANKR_BSC_TESTNET_RPC_URL;


// // =================================================================
// // 2. Wagmi 設定
// // =================================================================
// // createConfig 用於建立 wagmi 的客戶端設定。
// // 我們在這裡定義了支援的區塊鏈 (主網和測試網)，
// // 並為每條鏈指定了對應的 RPC 連接方式 (transport)。
// export const wagmiConfig = createConfig({
//   chains: [bsc, bscTestnet],
//   transports: {
//     // ★ 核心修正：為主網也設定備用鏈(fallback)
//     // .filter(Boolean) 會過濾掉未在 .env 中設定的 undefined 值。
//     [bsc.id]: fallback([
//       http(alchemyMainnetRpc),
//       http(infuraMainnetRpc),
//       http(ankrMainnetRpc),
//     ].filter(Boolean)),
    
//     // 為測試網設定備用鏈(fallback)。
//     // wagmi 會依序嘗試陣列中的 RPC，如果第一個失敗，會自動嘗試下一個。
//     [bscTestnet.id]: fallback([
//       http(alchemyTestnetRpc),
//       http(infuraTestnetRpc),
//       http(ankrTestnetRpc),
//     ].filter(Boolean)),
//   },
// });
