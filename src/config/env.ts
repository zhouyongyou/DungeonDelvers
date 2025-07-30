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
      return useDecentralized
        ? (cachedNetworkUrl || import.meta.env.VITE_THE_GRAPH_NETWORK_URL)
        : (cachedStudioUrl || import.meta.env.VITE_THE_GRAPH_API_URL);
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
      // 核心合約
      ORACLE: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS || 
              '0xb9317179466fd7fb253669538dE1c4635E81eAc4',
      DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || 
                       '0x2fcd1bbbB88cce8040A2DE92E97d5375d8B088da',
      PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || 
                    '0xE4654796e4c03f88776a666f3A47E16F5d6BE4FA',
      ALTAR_OF_ASCENSION: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || 
                          '0xFaEda7886Cc9dF32a96ebc7DaF4DA1a27d3fB3De',
      DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || 
                      '0xd13250E0F0766006816d7AfE95EaEEc5e215d082',
      
      // NFT 合約
      HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || 
            '0x141F081922D4015b3157cdA6eE970dff34bb8AAb',
      RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || 
             '0xB1eb505426e852B8Dca4BF41454a7A22D2B6F3D3',
      PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || 
             '0x096aa1e0F9c87E57e8b69a7DD35D893D13BbA8F5',
      VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || 
                   '0x43f03C89aF6091090bE05C00a65CC4934CF5f90D',
      PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || 
                      '0xc5A972B7186562f768c8aC97D3b4ca15A019657d',
      DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || 
                    '0x4D353aFC420E6187bfA5F99f0DdD8F7F137c20E9',
      
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