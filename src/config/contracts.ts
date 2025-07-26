// Generated from v22-config.js on 2025-07-25
// DO NOT EDIT MANUALLY - Use npm run sync:config
// Version: V22 - 部署自適應 TWAP Oracle，永不失敗的價格查詢

export const CONTRACT_ADDRESSES = {
  USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
  SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
  ORACLE: '0xb9317179466fd7fb253669538dE1c4635E81eAc4',
  PLAYERVAULT: '0x76d4f6f7270eE61743487c43Cf5E7281238d77F9',
  HERO: '0x141F081922D4015b3157cdA6eE970dff34bb8AAb',
  RELIC: '0xB1eb505426e852B8Dca4BF41454a7A22D2B6F3D3',
  PARTY: '0x0B97726acd5a8Fe73c73dC6D473A51321a2e62ee',
  VIPSTAKING: '0xc59B9944a9CbB947F4067F941EbFB0a5A2564eb9',
  PLAYERPROFILE: '0x4998FADF96Be619d54f6E9bcc654F89937201FBe',
  DUNGEONCORE: '0x4D353aFC420E6187bfA5F99f0DdD8F7F137c20E9',
  DUNGEONMASTER: '0xd13250E0F0766006816d7AfE95EaEEc5e215d082',
  DUNGEONSTORAGE: '0x17Bd4d145D7dA47833D797297548039D4E666a8f',
  ALTAROFASCENSION: '0xfb121441510296A92c8A2Cc04B6Aff1a2f72cd3f',
  DUNGEONMASTERWALLET: '0x10925A7138649C7E1794CE646182eeb5BF8ba647',
  UNISWAP_POOL: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
} as const;

export const DEPLOYMENT_VERSION = 'V22';
export const DEPLOYMENT_DATE = '2025-07-25';

// Network Configuration
export const NETWORK_CONFIG = {
  chainId: 56,
  name: 'BSC Mainnet',
  rpc: 'https://bsc-dataseed.binance.org/',
  explorer: 'https://bscscan.com'
};

// Subgraph Configuration
export const SUBGRAPH_CONFIG = {
  studio: 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.1.0',
  decentralized: 'https://gateway.thegraph.com/api/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
  useDecentralized: import.meta.env.PROD
};

// Oracle V22 Configuration
export const ORACLE_CONFIG = {
  version: "V22",
  adaptivePeriods: [1800,900,300,60],
  features: [
    "自適應 TWAP 週期",
    "自動降級機制",
    "永不失敗查詢",
    "向後兼容 V21"
  ]
};

// Contract helper functions
export type ContractName = keyof typeof CONTRACT_ADDRESSES;

export interface ContractInfo {
  address: string;
  name: string;
}

/**
 * Get contract information by chain ID and contract name
 * @param chainId - The chain ID (56 for BSC Mainnet)
 * @param contractName - The name of the contract
 * @returns Contract information or undefined if not found
 */
export function getContract(chainId: number, contractName: ContractName | keyof typeof LEGACY_CONTRACT_NAMES): ContractInfo | undefined {
  // Only support BSC Mainnet for now
  if (chainId !== 56) {
    return undefined;
  }

  // Try to get address directly (uppercase format)
  let address = CONTRACT_ADDRESSES[contractName as ContractName];
  let finalContractName = contractName as ContractName;

  // If not found, try legacy name mapping (lowercase format)
  if (!address && contractName in LEGACY_CONTRACT_NAMES) {
    finalContractName = LEGACY_CONTRACT_NAMES[contractName as keyof typeof LEGACY_CONTRACT_NAMES] as ContractName;
    address = CONTRACT_ADDRESSES[finalContractName];
  }

  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return undefined;
  }

  return {
    address,
    name: finalContractName
  };
}

/**
 * Get contract address by name (legacy compatibility)
 * @param contractName - The name of the contract
 * @returns Contract address or undefined
 */
export function getContractAddress(contractName: ContractName): string | undefined {
  const address = CONTRACT_ADDRESSES[contractName];
  return (address && address !== '0x0000000000000000000000000000000000000000') ? address : undefined;
}

// Legacy contract name mappings for backward compatibility
export const LEGACY_CONTRACT_NAMES = {
  soulShard: 'SOULSHARD',
  hero: 'HERO',
  relic: 'RELIC',
  party: 'PARTY',
  dungeonCore: 'DUNGEONCORE',
  dungeonMaster: 'DUNGEONMASTER',
  dungeonStorage: 'DUNGEONSTORAGE',
  playerVault: 'PLAYERVAULT',
  playerProfile: 'PLAYERPROFILE',
  vipStaking: 'VIPSTAKING',
  oracle: 'ORACLE',
  altarOfAscension: 'ALTAROFASCENSION',
  dungeonMasterWallet: 'DUNGEONMASTERWALLET',
  uniswapPool: 'UNISWAP_POOL',
  usd: 'USD'
} as const;
