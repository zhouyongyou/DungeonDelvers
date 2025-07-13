export const DEVELOPER_ADDRESS = '0x10925A7138649C7E1794CE646182eeb5BF8ba647';

// 應用程式常數配置
export const APP_CONSTANTS = {
  // 網路配置
  SUPPORTED_CHAIN_ID: 56, // BSC Mainnet
  CHAIN_NAMES: {
    56: 'BSC',
    97: 'BSC Testnet',
  },

  // 交易配置
  TRANSACTION_TIMEOUT: 60_000, // 60 秒
  TRANSACTION_CONFIRMATIONS: 1,
  MAX_RETRY_ATTEMPTS: 3,

  // API 配置
  GRAPHQL_REQUEST_TIMEOUT: 30_000, // 30 秒
  CACHE_TTL: {
    SHORT: 1000 * 60 * 2,      // 2 分鐘
    MEDIUM: 1000 * 60 * 5,     // 5 分鐘
    LONG: 1000 * 60 * 30,      // 30 分鐘
    EXTRA_LONG: 1000 * 60 * 60 * 2, // 2 小時
  },

  // UI 配置
  LOADING_DELAYS: {
    FAST: 300,     // 快速載入動畫
    NORMAL: 500,   // 一般載入動畫
    SLOW: 1000,    // 慢速載入動畫
  },

  // 分頁配置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    LARGE_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
  },

  // NFT 配置
  NFT: {
    MAX_ITEMS_PER_BATCH: 50,
    IMAGE_PLACEHOLDER_TIMEOUT: 5000,
    RARITY_LEVELS: {
      COMMON: 1,
      UNCOMMON: 2,
      RARE: 3,
      EPIC: 4,
      LEGENDARY: 5,
    },
  },

  // VIP 等級配置
  VIP_LEVELS: {
    BRONZE: { min: 1, max: 3, name: 'BRONZE', icon: '🥉' },
    SILVER: { min: 4, max: 6, name: 'SILVER', icon: '🥈' },
    GOLD: { min: 7, max: 9, name: 'GOLD', icon: '🏆' },
    PLATINUM: { min: 10, max: 12, name: 'PLATINUM', icon: '⭐' },
    DIAMOND: { min: 13, max: 20, name: 'DIAMOND', icon: '💎' },
  },

  // 移動端配置
  MOBILE: {
    BREAKPOINTS: {
      SM: 640,
      MD: 768,
      LG: 1024,
      XL: 1280,
    },
    TOUCH_DELAY: 300,
    LONG_PRESS_DELAY: 500,
    SWIPE_THRESHOLD: 50,
  },

  // 遊戲配置
  GAME: {
    MAX_PARTY_SIZE: 5,
    MAX_HERO_LEVEL: 100,
    COOLDOWN_HOURS: 24,
    PROVISION_TYPES: ['FOOD', 'MEDICINE', 'EQUIPMENT'],
  },

  // 外部連結
  EXTERNAL_LINKS: {
    BSC_SCAN: 'https://bscscan.com',
    PANCAKESWAP: 'https://pancakeswap.finance',
    DOCUMENTATION: 'https://docs.dungeondelvers.xyz',
    DISCORD: 'https://discord.gg/dungeondelvers',
    TWITTER: 'https://twitter.com/DungeonDelvers',
  },

  // 錯誤訊息
  ERROR_MESSAGES: {
    WALLET_NOT_CONNECTED: '請先連接錢包',
    WRONG_NETWORK: '請切換到正確的網路',
    INSUFFICIENT_BALANCE: '餘額不足',
    TRANSACTION_FAILED: '交易失敗',
    NETWORK_ERROR: '網路錯誤，請稍後重試',
    INVALID_INPUT: '輸入格式無效',
    CONTRACT_ERROR: '合約呼叫失敗',
  },

  // 成功訊息
  SUCCESS_MESSAGES: {
    TRANSACTION_SUBMITTED: '交易已提交',
    APPROVAL_SUCCESS: '授權成功',
    STAKE_SUCCESS: '質押成功',
    UNSTAKE_SUCCESS: '解除質押成功',
    MINT_SUCCESS: '鑄造成功',
    TRANSFER_SUCCESS: '轉移成功',
  },

  // 數值格式化
  FORMATTING: {
    DECIMAL_PLACES: {
      TOKEN: 4,
      USD: 2,
      PERCENTAGE: 1,
    },
    LARGE_NUMBER_THRESHOLD: 1000000, // 1M
  },

  // 動畫配置
  ANIMATIONS: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500,
    },
    EASING: {
      IN: 'ease-in',
      OUT: 'ease-out',
      IN_OUT: 'ease-in-out',
    },
  },

  // 本地儲存鍵值
  STORAGE_KEYS: {
    WALLET_CONNECT: 'walletconnect',
    USER_PREFERENCES: 'user_preferences',
    CACHE_TIMESTAMP: 'cache_timestamp',
    LAST_VISITED_PAGE: 'last_visited_page',
  },
} as const;

// 工具函數
export const getVipTier = (level: number) => {
  const { VIP_LEVELS } = APP_CONSTANTS;
  
  for (const [tierName, tierData] of Object.entries(VIP_LEVELS)) {
    if (level >= tierData.min && level <= tierData.max) {
      return { ...tierData, name: tierName };
    }
  }
  
  return { name: 'STANDARD', icon: '👑', min: 0, max: 0 };
};

export const formatAddress = (address: string, startChars = 6, endChars = 4) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

export const isValidAddress = (address: string) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const formatNumber = (
  value: number | string | bigint,
  type: 'token' | 'usd' | 'percentage' = 'token'
) => {
  const { DECIMAL_PLACES } = APP_CONSTANTS.FORMATTING;
  const numValue = typeof value === 'bigint' ? Number(value) : Number(value);
  
  if (isNaN(numValue)) return '0';
  
  const decimals = DECIMAL_PLACES[type.toUpperCase() as keyof typeof DECIMAL_PLACES] || 2;
  
  if (numValue >= APP_CONSTANTS.FORMATTING.LARGE_NUMBER_THRESHOLD) {
    const units = ['', 'K', 'M', 'B', 'T'];
    let unitIndex = 0;
    let scaledValue = numValue;
    
    while (scaledValue >= 1000 && unitIndex < units.length - 1) {
      scaledValue /= 1000;
      unitIndex++;
    }
    
    return `${scaledValue.toFixed(decimals)}${units[unitIndex]}`;
  }
  
  return numValue.toFixed(decimals);
};

// 類型定義
export type AppConstant = typeof APP_CONSTANTS;
export type VipTier = ReturnType<typeof getVipTier>;
export type ChainId = keyof typeof APP_CONSTANTS.CHAIN_NAMES; 