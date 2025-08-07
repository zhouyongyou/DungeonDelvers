// env.ts - 統一的環境變數配置
// 整合所有散落的環境變數，避免重複和混亂

import { subgraphConfig } from './subgraphConfig';

// The Graph 配置
const useDecentralized = import.meta.env.VITE_USE_DECENTRALIZED_GRAPH === 'true';

// 快取子圖 URL（初始化時載入）
let cachedStudioUrl: string | null = null;
let cachedNetworkUrl: string | null = null;

// 初始化子圖 URL
export async function initializeSubgraphUrls() {
  cachedStudioUrl = await subgraphConfig.getStudioUrl();
  cachedNetworkUrl = await subgraphConfig.getDecentralizedUrl();
}

export const ENV = {
  // =================================================================
  // The Graph API 配置（統一管理）
  // =================================================================
  THE_GRAPH: {
    // 主要 API URL（根據配置自動選擇）
    get API_URL() {
      // 強制使用去中心化端點，因為 Studio 端點已失效
      return cachedNetworkUrl || import.meta.env.VITE_THE_GRAPH_NETWORK_URL || 
             'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';
    },
    
    // 各版本 URL（從 configLoader 載入，保留環境變數作為備份）
    get STUDIO_URL() {
      return cachedStudioUrl || import.meta.env.VITE_THE_GRAPH_API_URL || 
             'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';
    },
    get NETWORK_URL() {
      return cachedNetworkUrl || import.meta.env.VITE_THE_GRAPH_NETWORK_URL ||
             'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';
    },
    
    // 配置標記
    USE_DECENTRALIZED: useDecentralized,
  },

  // =================================================================
  // RPC 配置
  // =================================================================
  RPC: {
    BSC_RPC: import.meta.env.VITE_BSC_RPC || 'https://bsc-dataseed1.binance.org/',
    ALCHEMY_KEYS: [
      import.meta.env.VITE_ALCHEMY_KEY,
      import.meta.env.VITE_ALCHEMY_KEY_PUBLIC, // 混合策略：直接暴露的 key
      import.meta.env.VITE_ALCHEMY_KEY_1,
      import.meta.env.VITE_ALCHEMY_KEY_2,
      import.meta.env.VITE_ALCHEMY_KEY_3,
      import.meta.env.VITE_ALCHEMY_KEY_4,
      import.meta.env.VITE_ALCHEMY_KEY_5,
    ].filter(Boolean),
  },

  // =================================================================
  // 服務端點
  // =================================================================
  SERVICES: {
    METADATA_SERVER: import.meta.env.VITE_METADATA_SERVER_URL || 
                     'https://dungeon-delvers-metadata-server.onrender.com',
    MAINNET_URL: import.meta.env.VITE_MAINNET_URL || 'https://dungeondelvers.xyz',
  },

  // =================================================================
  // 開發者配置
  // =================================================================
  DEVELOPER: {
    ADDRESS: import.meta.env.VITE_DEVELOPER_ADDRESS || 
             '0x10925A7138649C7E1794CE646182eeb5BF8ba647',
  },

  // =================================================================
  // 合約地址（統一管理，避免重複定義）
  // =================================================================
  CONTRACTS: {
    MAINNET: {
      // 核心合約 (V25/V26 - 最新版本)
      ORACLE: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS || 
              '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
      DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || 
                       '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
      PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || 
                    '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
      ALTAR_OF_ASCENSION: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || 
                          '0x3de7c97e6b65be8a1d726f5261cda1dd7d1e0cf1',
      DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || 
                      '0xE391261741Fad5FCC2D298d00e8c684767021253',
      
      // NFT 合約 (V25 - 8/7 am 7 deployment)
      HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || 
            '0x5eded2670a6e7eb4a9c581bc397edc3b48cafd6d',
      RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || 
             '0x7a9469587ffd28a69d4420d8893e7a0e92ef6316',
      PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || 
             '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
      VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || 
                   '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
      PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || 
                      '0x0f5932e89908400a5AfDC306899A2987b67a3155',
      DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || 
                    '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
      
      // 代幣合約
      SOUL_SHARD_TOKEN: import.meta.env.VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS || 
                        '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
      USD_TOKEN: import.meta.env.VITE_MAINNET_USD_TOKEN_ADDRESS || 
                 '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
      POOL: import.meta.env.VITE_MAINNET_UNISWAP_POOL_ADDRESS || 
            '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
    },
  },

  // =================================================================
  // 第三方服務
  // =================================================================
  THIRD_PARTY: {
    WALLET_CONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 
                               'd02f4199d4862ab0a12a3d0424fb567b',
  },

  // =================================================================
  // 開發環境配置
  // =================================================================
  DEV: {
    IS_DEVELOPMENT: import.meta.env.DEV,
    IS_PRODUCTION: import.meta.env.PROD,
  },
} as const;

// 類型定義
export type EnvConfig = typeof ENV;

// 輔助函數：獲取當前活躍的 Alchemy Key
export function getActiveAlchemyKey(index: number = 0): string | undefined {
  return ENV.RPC.ALCHEMY_KEYS[index % ENV.RPC.ALCHEMY_KEYS.length];
}

// 輔助函數：獲取合約地址（支援多鏈，預留擴展）
export function getContractAddress(
  contractName: keyof typeof ENV.CONTRACTS.MAINNET,
  chainId: number = 56 // BSC Mainnet
): string {
  // 未來可以根據 chainId 返回不同鏈的地址
  return ENV.CONTRACTS.MAINNET[contractName];
}

// 導出舊的相容性變數名稱（漸進式遷移）
export const THE_GRAPH_API_URL = ENV.THE_GRAPH.API_URL;
export const DEVELOPER_ADDRESS = ENV.DEVELOPER.ADDRESS;