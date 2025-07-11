/// <reference types="vite/client" />

// 擴充 Vite 的 ImportMetaEnv 介面
// 這個檔案的作用是告訴 TypeScript，我們的專案會從 .env 檔案中讀取哪些環境變數。
// ★ 核心修正：移除了所有與測試網 (TESTNET) 相關的變數定義，使設定檔與主網專注的目標保持一致。

interface ImportMetaEnv {
  // =================================================================
  // Section: Vite 內建環境變數
  // =================================================================
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  
  // =================================================================
  // Section: 網站 URL 設定
  // =================================================================
  readonly VITE_MAINNET_URL: string;

  // =================================================================
  // Section: 主網 RPC 節點
  // =================================================================
  readonly VITE_ALCHEMY_BSC_MAINNET_RPC_URL?: string;
  readonly VITE_INFURA_BSC_MAINNET_RPC_URL?: string;
  readonly VITE_ANKR_BSC_MAINNET_RPC_URL?: string;

  // =================================================================
  // Section: 主網核心代幣與流動性池合約地址
  // =================================================================
  readonly VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS: string;
  readonly VITE_USD_TOKEN_ADDRESS: string;
  readonly VITE_MAINNET_POOL_ADDRESS: string;

  // =================================================================
  // Section: 主網 SVG 函式庫合約地址
  // =================================================================
  readonly VITE_MAINNET_DUNGEONSVGLIBRARY_ADDRESS: string;
  readonly VITE_MAINNET_VIPSVGLIBRARY_ADDRESS: string;
  readonly VITE_MAINNET_PROFILESVGLIBRARY_ADDRESS: string;

  // =================================================================
  // Section: 主網核心功能合約地址
  // =================================================================
  readonly VITE_MAINNET_ORACLE_ADDRESS: string;
  readonly VITE_MAINNET_DUNGEONSTORAGE_ADDRESS: string;
  readonly VITE_MAINNET_PLAYERVAULT_ADDRESS: string;
  readonly VITE_MAINNET_ALTAROFASCENSION_ADDRESS: string;
  readonly VITE_MAINNET_DUNGEONMASTER_ADDRESS: string;
  readonly VITE_MAINNET_PLAYERPROFILE_ADDRESS: string;
  readonly VITE_MAINNET_DUNGEONCORE_ADDRESS: string;

  // =================================================================
  // Section: 主網 NFT 合約地址
  // =================================================================
  readonly VITE_MAINNET_HERO_ADDRESS: string;
  readonly VITE_MAINNET_RELIC_ADDRESS: string;
  readonly VITE_MAINNET_PARTY_ADDRESS: string;
  readonly VITE_MAINNET_VIPSTAKING_ADDRESS: string;

      readonly VITE_THE_GRAPH_STUDIO_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
