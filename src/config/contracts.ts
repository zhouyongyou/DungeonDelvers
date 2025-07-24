// DungeonDelvers Contract Configuration
// Version: V18 with V2Fixed Altar
// Updated: 2025-07-24T09:30:00.000Z

export const CONTRACT_ADDRESSES = {
  TESTUSD: '0xa095B8c9D9964F62A7dbA3f60AA91dB381A3e074',
  SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
  HERO: '0x6E4dF8F5413B42EC7b82D2Bc20254Db5A11DB374',
  RELIC: '0x40e001D24aD6a28FC40870901DbF843D921fe56C',
  PARTY: '0xb26466A44f51CfFF8C13837dA8B2aD6BA82c62dF',
  DUNGEONCORE: '0xDD970622bE2ac33163B1DCfB4b2045CeeD9Ab1a0',
  DUNGEONMASTER: '0x5dCf67D1486D80Dfcd8E665D240863D58eb73ce0',
  DUNGEONSTORAGE: '0x812C0433EeDD0bAf2023e9A4FB3dF946E5080D9A',
  PLAYERVAULT: '0xd0c6e73e877513e45491842e74Ac774ef735782D',
  PLAYERPROFILE: '0xE5E85233082827941A9E9cb215bDB83407d7534b',
  VIPSTAKING: '0xe4B6C86748b49D91ac635A56a9DF25af963F8fdd',
  ORACLE: '0x1Cd2FBa6f4614383C32f4807f67f059eF4Dbfd0c',
  ALTAROFASCENSION: '0xCA4f59E6ccDEe6c8D0Ef239c2b8b007BFcd935E0',
  DUNGEONMASTERWALLET: '0x10925A7138649C7E1794CE646182eeb5BF8ba647',
} as const;

export const DEPLOYMENT_VERSION = 'V18';
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
