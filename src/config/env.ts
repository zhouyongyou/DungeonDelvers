/**
 * 統一的環境變數管理
 * 集中管理所有環境變數，避免重複引用和配置錯誤
 */

// 環境變數配置
export const ENV = {
  // API 相關
  THE_GRAPH_API_URL: import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL,
  
  // RPC 端點
  ALCHEMY_BSC_RPC: import.meta.env.VITE_ALCHEMY_BSC_MAINNET_RPC_URL,
  INFURA_BSC_RPC: import.meta.env.VITE_INFURA_BSC_MAINNET_RPC_URL,
  ANKR_BSC_RPC: import.meta.env.VITE_ANKR_BSC_MAINNET_RPC_URL,
  
  // 主網設定
  MAINNET_URL: import.meta.env.VITE_MAINNET_URL || "https://dungeondelvers.xyz",
  
  // 合約地址
  CONTRACTS: {
    SOUL_SHARD: import.meta.env.VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS,
    HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS,
    RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS,
    PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS,
    VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS,
    DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS,
    DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS,
    DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS,
    PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS,
    PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS,
    ALTAR_OF_ASCENSION: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS,
    ORACLE: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS,
  },
  
  // 開發環境標識
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;

// 必要環境變數驗證
const requiredEnvVars = [
  'VITE_THE_GRAPH_STUDIO_API_URL',
  'VITE_MAINNET_HERO_ADDRESS',
  'VITE_MAINNET_RELIC_ADDRESS',
  'VITE_MAINNET_PARTY_ADDRESS',
] as const;

// 驗證必要環境變數
export function validateEnvironment(): void {
  const missingVars: string[] = [];
  
  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      missingVars.push(envVar);
    }
  }
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }
}

// 獲取備用 RPC URL
export function getFallbackRpcUrls(): string[] {
  const urls = [
    ENV.ALCHEMY_BSC_RPC,
    ENV.INFURA_BSC_RPC,
    ENV.ANKR_BSC_RPC,
    'https://bsc-dataseed1.binance.org/',
    'https://bsc-dataseed2.binance.org/',
  ].filter(Boolean) as string[];
  
  return urls;
}

// 環境變數類型導出
export type EnvConfig = typeof ENV;

// 在應用啟動時驗證環境變數
if (ENV.IS_PROD) {
  validateEnvironment();
}