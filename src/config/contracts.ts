// DungeonDelvers Contract Configuration
// Version: V19 Production
// Updated: 2025-07-24T23:00:00.000Z

export const CONTRACT_ADDRESSES = {
  USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
  SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
  HERO: '0x141F081922D4015b3157cdA6eE970dff34bb8AAb',
  RELIC: '0xB1eb505426e852B8Dca4BF41454a7A22D2B6F3D3',
  PARTY: '0xf240c4fD2651Ba41ff09eB26eE01b21f42dD9957',
  DUNGEONCORE: '0x4D353aFC420E6187bfA5F99f0DdD8F7F137c20E9',
  DUNGEONMASTER: '0xd34ddc336071FE7Da3c636C3Df7C3BCB77B1044a',
  DUNGEONSTORAGE: '0x6B85882ab32471Ce4a6599A7256E50B8Fb1fD43e',
  PLAYERVAULT: '0xF68cEa7E171A5caF151A85D7BEb2E862B83Ccf78',
  PLAYERPROFILE: '0x1d36C2F3f0C9212422B94608cAA72080CBf34A41',
  VIPSTAKING: '0x43A6C6cC9D15f2C68C7ec98deb01f2b69a618470',
  ORACLE: '0x54Ff2524C996d7608CaE9F3D9dd2075A023472E9',
  ALTAROFASCENSION: '0xb53c51Dc426c2Bd29da78Ac99426c55A6D6a51Ab',
  DUNGEONMASTERWALLET: '0x10925A7138649C7E1794CE646182eeb5BF8ba647',
} as const;

export const DEPLOYMENT_VERSION = 'V19';
export const DEPLOYMENT_DATE = '2025-07-24';

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

// Contract helper functions
export type ContractName = keyof typeof CONTRACT_ADDRESSES;

export interface ContractInfo {
  address: string;
  name: string;
}

/**
 * Get contract information by chain ID and contract name
 * @param chainId - The chain ID (56 for BSC Mainnet)
 * @param contractName - The name of the contract (supports both uppercase and lowercase)
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
  // 測試代幣映射
  testUsd: 'TESTUSD',
  TESTUSD: 'TESTUSD',
  SOULSHARD: 'SOULSHARD',
  ORACLE: 'ORACLE',
  DUNGEONCORE: 'DUNGEONCORE'
} as const;

/**
 * Get contract with legacy name support
 * @param chainId - The chain ID
 * @param legacyName - Legacy contract name (camelCase)
 * @returns Contract information
 */
export function getContractLegacy(chainId: number, legacyName: keyof typeof LEGACY_CONTRACT_NAMES): ContractInfo | undefined {
  const contractName = LEGACY_CONTRACT_NAMES[legacyName] as ContractName;
  return getContract(chainId, contractName);
}
