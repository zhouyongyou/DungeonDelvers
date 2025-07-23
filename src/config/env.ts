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
                'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.8',
    NETWORK_URL: import.meta.env.VITE_THE_GRAPH_NETWORK_URL ||
                 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
    
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
              '0xcF7c97a055CBf8d61Bb57254F0F54A2cbaa09806',
      DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || 
                       '0xea21D782CefD785B128346F39f1574c8D6eb64C9',
      PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || 
                    '0xA5BA5EE03d452eA5e57c72657c8EC03C6F388E1f',
      ALTAR_OF_ASCENSION: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || 
                          '0xB9878bBDcB82926f0D03E0157e8c34AEa35E06cb',
      DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || 
                      '0xb71f6ED7B13452a99d740024aC17470c1b4F0021',
      
      // NFT 合約
      HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || 
            '0x6f4Bd03ea8607c6e69bCc971b7d3CC9e5801EF5E',
      RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || 
             '0x853DAAeC0ae354bF40c732C199Eb09F1a0CD3dC1',
      PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || 
             '0x847DceaE26aF1CFc09beC195CE87a9b5701863A7',
      VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || 
                   '0x738eA7A2408F56D47EF127954Db42D37aE6339D5',
      PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || 
                      '0x39b09c3c64D5ada443d2965cb31C7bad7AC66F2f',
      DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || 
                    '0x2CB2Bd1b18CDd0cbF37cD6F7FF672D03E7a038a5',
      
      // 代幣合約
      SOUL_SHARD_TOKEN: import.meta.env.VITE_MAINNET_SOULSHARDTOKEN_ADDRESS || 
                        '0xc88dAD283Ac209D77Bfe452807d378615AB8B94a',
      USD_TOKEN: import.meta.env.VITE_MAINNET_USD_TOKEN_ADDRESS || 
                 '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
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