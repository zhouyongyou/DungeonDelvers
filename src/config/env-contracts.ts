// ENV 合約載入器 - 從環境變數讀取合約地址
// 這個文件將替代 contracts.ts，實現真正的 ENV 統一管理

interface ContractAddresses {
  DUNGEONCORE: string;
  ORACLE: string;
  HERO: string;
  RELIC: string;
  PARTY: string;
  DUNGEONMASTER: string;
  DUNGEONSTORAGE: string;
  ALTAROFASCENSION: string;
  PLAYERVAULT: string;
  PLAYERPROFILE: string;
  VIPSTAKING: string;
  SOULSHARD: string;
  USD: string;
  VRFMANAGER: string;
  DUNGEONMASTERWALLET?: string;
}

// 環境變數讀取函數
const getEnvContract = (name: string): string => {
  const address = import.meta.env[`VITE_${name}_ADDRESS`];
  if (!address) {
    console.warn(`Missing environment variable: VITE_${name}_ADDRESS`);
    // 返回零地址作為後備，避免應用崩潰
    return '0x0000000000000000000000000000000000000000';
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    console.error(`Invalid address format for ${name}: ${address}`);
    return '0x0000000000000000000000000000000000000000';
  }
  return address;
};

// 從環境變數載入所有合約地址
export const CONTRACTS: ContractAddresses = {
  DUNGEONCORE: getEnvContract('DUNGEONCORE'),
  ORACLE: getEnvContract('ORACLE'),
  HERO: getEnvContract('HERO'),
  RELIC: getEnvContract('RELIC'),
  PARTY: getEnvContract('PARTY'),
  DUNGEONMASTER: getEnvContract('DUNGEONMASTER'),
  DUNGEONSTORAGE: getEnvContract('DUNGEONSTORAGE'),
  ALTAROFASCENSION: getEnvContract('ALTAROFASCENSION'),
  PLAYERVAULT: getEnvContract('PLAYERVAULT'),
  PLAYERPROFILE: getEnvContract('PLAYERPROFILE'),
  VIPSTAKING: getEnvContract('VIPSTAKING'),
  SOULSHARD: getEnvContract('SOULSHARD'),
  USD: getEnvContract('USD'),
  VRFMANAGER: getEnvContract('VRF_MANAGER_V2PLUS'),
  DUNGEONMASTERWALLET: '0x10925A7138649C7E1794CE646182eeb5BF8ba647', // 固定地址
};

// 網路配置
export const NETWORK_CONFIG = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID) || 56,
  subgraphUrl: import.meta.env.VITE_SUBGRAPH_URL || '',
  backendUrl: import.meta.env.VITE_BACKEND_URL || '',
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://bsc-dataseed.binance.org',
  startBlock: Number(import.meta.env.VITE_START_BLOCK) || 56757876,
};

// 合約版本信息
export const CONTRACT_VERSION = import.meta.env.VITE_CONTRACT_VERSION || 'V25';

// VRF 配置
export const VRF_CONFIG = {
  enabled: import.meta.env.VITE_VRF_ENABLED === 'true',
  requestPrice: import.meta.env.VITE_VRF_PRICE || '0',
  platformFee: import.meta.env.VITE_PLATFORM_FEE || '0',
  mode: import.meta.env.VITE_VRF_MODE || 'subscription', // subscription 或 direct
};

// 向後兼容 - 匯出個別地址
export const {
  DUNGEONCORE,
  ORACLE,
  SOULSHARD,
  HERO,
  RELIC,
  PARTY,
  DUNGEONMASTER,
  DUNGEONSTORAGE,
  PLAYERVAULT,
  PLAYERPROFILE,
  VIPSTAKING,
  ALTAROFASCENSION,
  VRFMANAGER,
  DUNGEONMASTERWALLET,
} = CONTRACTS;

// 為了向後兼容，提供舊的數據結構格式
export const CONTRACT_ADDRESSES = {
  56: CONTRACTS
};

// Helper functions for backward compatibility
export const getContract = (name: keyof ContractAddresses): string => {
  return CONTRACTS[name] || '';
};

export const getContractAddress = (name: string): string => {
  return CONTRACTS[name as keyof ContractAddresses] || '';
};

// Export contract info for debugging
export const CONTRACT_INFO = {
  version: CONTRACT_VERSION,
  network: import.meta.env.VITE_NETWORK || "BSC Mainnet",
  deploymentBlock: NETWORK_CONFIG.startBlock,
  lastUpdated: import.meta.env.VITE_DEPLOYMENT_DATE || new Date().toISOString()
};

// Legacy contract name mappings for backward compatibility
export const LEGACY_CONTRACT_NAMES = {
  soulShardToken: 'SOULSHARD',
  testUsd: 'USD'
} as const;

// Calculate total mint fee (V25 訂閱模式：只有平台費，無 VRF 費)
export const calculateMintFee = (
  quantity: number, 
  contractPlatformFee?: bigint,
  contractVrfFee?: bigint
) => {
  const platformFeePerUnit = contractPlatformFee !== undefined
    ? Number(contractPlatformFee) / 1e18 
    : parseFloat(VRF_CONFIG.platformFee);
  
  // V25 訂閱模式：VRF 費用始終為 0（由項目方承擔）
  const vrfFee = VRF_CONFIG.mode === 'subscription' ? 0 : (
    contractVrfFee !== undefined
      ? Number(contractVrfFee) / 1e18 
      : parseFloat(VRF_CONFIG.requestPrice)
  );

  const platformFeeTotal = (platformFeePerUnit * quantity);
  const totalFee = platformFeeTotal + vrfFee;
  
  const formatBnb = (value: number) => {
    return parseFloat(value.toFixed(6)).toString();
  };
  
  return {
    platformFee: formatBnb(platformFeeTotal),
    vrfFee: formatBnb(vrfFee), 
    total: formatBnb(totalFee),
    isSubscription: VRF_CONFIG.mode === 'subscription'
  };
};

// 調試信息 - 開發模式下顯示載入的地址
if (import.meta.env.DEV) {
  console.group('🏰 DungeonDelvers 合約地址 (ENV)');
  console.log('版本:', CONTRACT_VERSION);
  console.log('鏈 ID:', NETWORK_CONFIG.chainId);
  console.log('合約地址:', CONTRACTS);
  console.log('子圖 URL:', NETWORK_CONFIG.subgraphUrl);
  console.groupEnd();
}