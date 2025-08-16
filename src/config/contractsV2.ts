// contractsV2.ts - 簡化的合約配置（使用配置載入器）
// 這個文件取代原本的 contracts.ts，大幅減少硬編碼

import { configLoader } from './configLoader';

// 合約名稱映射（為了向後兼容）
const CONTRACT_NAME_MAP: { [key: string]: string } = {
  'hero': 'HERO',
  'relic': 'RELIC',
  'party': 'PARTY',
  'party': 'PARTY',
  'dungeonCore': 'DUNGEONCORE',
  'dungeonMaster': 'DUNGEONMASTER',
  'dungeonMasterV8': 'DUNGEONMASTER',
  'dungeonStorage': 'DUNGEONSTORAGE',
  'playerVault': 'PLAYERVAULT',
  'playerProfile': 'PLAYERPROFILE',
  'vipStaking': 'VIPSTAKING',
  'oracle': 'ORACLE',
  'altarOfAscension': 'ALTAROFASCENSION',
  'soulShard': 'SOULSHARD',
  'testUSDToken': 'TESTUSD'
};

// 獲取合約地址（統一接口）
export function getContractAddress(contractName: string, chainId: number = 56): `0x${string}` {
  // 標準化合約名稱
  const normalizedName = CONTRACT_NAME_MAP[contractName] || contractName.toUpperCase();
  
  // 從配置載入器獲取地址
  const address = configLoader.getContractAddress(normalizedName);
  
  if (!address) {
    console.warn(`Contract address not found for: ${contractName} (${normalizedName})`);
    return '0x0000000000000000000000000000000000000000' as `0x${string}`;
  }
  
  return address as `0x${string}`;
}

// 獲取所有合約地址
export async function getAllContractAddresses(): Promise<{ [key: string]: `0x${string}` }> {
  const config = await configLoader.getConfig();
  const addresses: { [key: string]: `0x${string}` } = {};
  
  Object.entries(config.contracts).forEach(([name, address]) => {
    addresses[name] = address as `0x${string}`;
  });
  
  return addresses;
}

// 導出常用合約地址的 getter（向後兼容）
export const contracts = {
  hero: () => getContractAddress('hero'),
  relic: () => getContractAddress('relic'),
  party: () => getContractAddress('party'),
  dungeonCore: () => getContractAddress('dungeonCore'),
  dungeonMaster: () => getContractAddress('dungeonMaster'),
  dungeonStorage: () => getContractAddress('dungeonStorage'),
  playerVault: () => getContractAddress('playerVault'),
  playerProfile: () => getContractAddress('playerProfile'),
  vipStaking: () => getContractAddress('vipStaking'),
  oracle: () => getContractAddress('oracle'),
  altarOfAscension: () => getContractAddress('altarOfAscension'),
  soulShard: () => getContractAddress('soulShard'),
  testUSDToken: () => getContractAddress('testUSDToken')
};

// 網路配置
export async function getNetworkConfig() {
  const config = await configLoader.getConfig();
  return config.network;
}

// 子圖配置
export async function getSubgraphConfig() {
  const config = await configLoader.getConfig();
  return config.subgraph;
}

// 版本信息
export async function getDeploymentInfo() {
  const config = await configLoader.getConfig();
  return {
    version: config.version,
    lastUpdated: config.lastUpdated
  };
}