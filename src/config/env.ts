// env.ts - 統一的環境變數配置
// 整合所有散落的環境變數，避免重複和混亂

// The Graph 配置
const useDecentralized = import.meta.env.VITE_USE_DECENTRALIZED_GRAPH === 'true';

export const ENV = {
  // =================================================================
  // The Graph API 配置（統一管理）
  // =================================================================
  THE_GRAPH: {
    // 主要 API URL（根據配置自動選擇）
    API_URL: useDecentralized
      ? import.meta.env.VITE_THE_GRAPH_NETWORK_URL
      : import.meta.env.VITE_THE_GRAPH_API_URL,
    
    // 各版本 URL（保留以供特殊需求）
    STUDIO_URL: import.meta.env.VITE_THE_GRAPH_API_URL || 
                'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.1.1',
    NETWORK_URL: import.meta.env.VITE_THE_GRAPH_NETWORK_URL ||
                 'https://gateway.thegraph.com/api/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
    
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
              '0x1Cd2FBa6f4614383C32f4807f67f059eF4Dbfd0c',
      DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || 
                       '0x812C0433EeDD0bAf2023e9A4FB3dF946E5080D9A',
      PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || 
                    '0xd0c6e73e877513e45491842e74Ac774ef735782D',
      ALTAR_OF_ASCENSION: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || 
                          '0xCA4f59E6ccDEe6c8D0Ef239c2b8b007BFcd935E0',
      DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || 
                      '0x5dCf67D1486D80Dfcd8E665D240863D58eb73ce0',
      
      // NFT 合約
      HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || 
            '0x6E4dF8F5413B42EC7b82D2Bc20254Db5A11DB374',
      RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || 
             '0x40e001D24aD6a28FC40870901DbF843D921fe56C',
      PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || 
             '0xb26466A44f51CfFF8C13837dA8B2aD6BA82c62dF',
      VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || 
                   '0xe4B6C86748b49D91ac635A56a9DF25af963F8fdd',
      PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || 
                      '0xE5E85233082827941A9E9cb215bDB83407d7534b',
      DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || 
                    '0xDD970622bE2ac33163B1DCfB4b2045CeeD9Ab1a0',
      
      // 代幣合約
      SOUL_SHARD_TOKEN: import.meta.env.VITE_MAINNET_SOULSHARDTOKEN_ADDRESS || 
                        '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
      USD_TOKEN: import.meta.env.VITE_MAINNET_USD_TOKEN_ADDRESS || 
                 '0xa095B8c9D9964F62A7dbA3f60AA91dB381A3e074',
      POOL: import.meta.env.VITE_MAINNET_POOL_ADDRESS || 
            '0x737c5b0430d5aeb104680460179aaa38608b6169',
    },
  },

  // =================================================================
  // 第三方服務
  // =================================================================
  THIRD_PARTY: {
    WALLET_CONNECT_PROJECT_ID: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 
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