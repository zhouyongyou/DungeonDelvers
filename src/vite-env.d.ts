/// <reference types="vite/client" />

// 擴充 Vite 的 ImportMetaEnv 介面
// 這個檔案的作用是告訴 TypeScript，我們的專案會從 .env 檔案中讀取哪些環境變數。
// 這可以提供型別檢查和自動完成功能，讓開發更安全、更高效。

interface ImportMetaEnv {
  // =================================================================
  // Section: 網站 URL 設定
  // =================================================================
  readonly VITE_MAINNET_URL: string;
  readonly VITE_TESTNET_URL: string;

  // =================================================================
  // Section: 區塊鏈網路 RPC 節點
  // =================================================================
  // 主要 RPC 節點 (推薦使用 Alchemy)
  readonly VITE_ALCHEMY_BSC_MAINNET_RPC_URL: string;
  readonly VITE_ALCHEMY_BSC_TESTNET_RPC_URL: string;

  // 備用 RPC 節點 (可選)
  readonly VITE_INFURA_BSC_MAINNET_RPC_URL: string;
  readonly VITE_INFURA_BSC_TESTNET_RPC_URL: string;
  readonly VITE_ANKR_BSC_MAINNET_RPC_URL: string;
  readonly VITE_ANKR_BSC_TESTNET_RPC_URL: string;

  // =================================================================
  // Section: 核心代幣與流動性池合約地址
  // =================================================================
  readonly VITE_SOUL_SHARD_TOKEN_ADDRESS: string;
  readonly VITE_USD_TOKEN_ADDRESS: string;
  readonly VITE_TESTNET_POOL_ADDRESS: string;
  readonly VITE_MAINNET_POOL_ADDRESS: string;

  // =================================================================
  // Section: SVG 函式庫合約地址
  // =================================================================
  readonly VITE_TESTNET_DUNGEONSVGLIBRARY_ADDRESS: string;
  readonly VITE_TESTNET_VIPSVGLIBRARY_ADDRESS: string;
  readonly VITE_TESTNET_PROFILESVGLIBRARY_ADDRESS: string;
  readonly VITE_MAINNET_DUNGEONSVGLIBRARY_ADDRESS: string;
  readonly VITE_MAINNET_VIPSVGLIBRARY_ADDRESS: string;
  readonly VITE_MAINNET_PROFILESVGLIBRARY_ADDRESS: string;

  // =================================================================
  // Section: 核心功能合約地址
  // =================================================================
  readonly VITE_TESTNET_ORACLE_ADDRESS: string;
  readonly VITE_TESTNET_DUNGEONSTORAGE_ADDRESS: string;
  readonly VITE_TESTNET_PLAYERVAULT_ADDRESS: string;
  readonly VITE_TESTNET_ALTAROFASCENSION_ADDRESS: string;
  readonly VITE_TESTNET_DUNGEONMASTER_ADDRESS: string;
  readonly VITE_TESTNET_PLAYERPROFILE_ADDRESS: string;
  readonly VITE_TESTNET_DUNGEONCORE_ADDRESS: string;
  readonly VITE_MAINNET_ORACLE_ADDRESS: string;
  readonly VITE_MAINNET_DUNGEONSTORAGE_ADDRESS: string;
  readonly VITE_MAINNET_PLAYERVAULT_ADDRESS: string;
  readonly VITE_MAINNET_ALTAROFASCENSION_ADDRESS: string;
  readonly VITE_MAINNET_DUNGEONMASTER_ADDRESS: string;
  readonly VITE_MAINNET_PLAYERPROFILE_ADDRESS: string;
  readonly VITE_MAINNET_DUNGEONCORE_ADDRESS: string;

  // =================================================================
  // Section: NFT 合約地址
  // =================================================================
  readonly VITE_TESTNET_HERO_ADDRESS: string;
  readonly VITE_TESTNET_RELIC_ADDRESS: string;
  readonly VITE_TESTNET_PARTY_ADDRESS: string;
  readonly VITE_TESTNET_VIPSTAKING_ADDRESS: string;
  readonly VITE_MAINNET_HERO_ADDRESS: string;
  readonly VITE_MAINNET_RELIC_ADDRESS: string;
  readonly VITE_MAINNET_PARTY_ADDRESS: string;
  readonly VITE_MAINNET_VIPSTAKING_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
