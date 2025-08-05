// contractUtils.ts - 合約工具函數
// 提供合約配置和地址查詢功能

import { getContractAddress } from '../config/configLoader';
import { logger } from './logger';

export interface ContractConfig {
  address: string;
  name: string;
  type: string;
}

// 支援的合約類型映射
const CONTRACT_TYPE_MAP: Record<string, string> = {
  'DUNGEONCORE': 'DUNGEONCORE',
  'DUNGEONMASTER': 'DUNGEONMASTER', 
  'DUNGEONSTORAGE': 'DUNGEONSTORAGE',
  'PLAYERVAULT': 'PLAYERVAULT',
  'HERO': 'HERO',
  'RELIC': 'RELIC',
  'PARTY': 'PARTY',
  'VIPSTAKING': 'VIPSTAKING',
  'PLAYERPROFILE': 'PLAYERPROFILE',
  'ALTAROFASCENSION': 'ALTAROFASCENSION',
  'ORACLE': 'ORACLE',
  'SOULSHARD': 'SOULSHARD',
  'USD': 'USD',

  // 別名支援
  'HERONFT': 'HERO',
  'RELICNFT': 'RELIC',
  'PARTYNFT': 'PARTY',
  'PARTYMEMBERS': 'PARTY',
  'ALTAR': 'ALTAROFASCENSION',
  'ASCENSION': 'ALTAROFASCENSION',
};

/**
 * 獲取合約配置
 * @param contractType 合約類型標識
 * @returns 合約配置對象，如果找不到則返回 null
 */
export function getContractConfig(contractType: string): ContractConfig | null {
  try {
    // 標準化合約類型名稱
    const normalizedType = contractType.toUpperCase().replace(/\s+/g, '');
    const mappedType = CONTRACT_TYPE_MAP[normalizedType];
    
    if (!mappedType) {
      logger.warn(`Unknown contract type: ${contractType}`);
      return null;
    }

    // 獲取合約地址
    const address = getContractAddress(mappedType);
    
    if (!address) {
      logger.warn(`No address found for contract type: ${mappedType}`);
      return null;
    }

    return {
      address,
      name: mappedType,
      type: mappedType
    };
  } catch (error) {
    logger.error(`Failed to get contract config for ${contractType}:`, error);
    return null;
  }
}

/**
 * 檢查合約地址是否有效
 * @param address 合約地址
 * @returns 是否為有效的以太坊地址
 */
export function isValidContractAddress(address: string): boolean {
  if (!address) return false;
  
  // 基本格式檢查：0x + 40 個十六進制字符
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}

/**
 * 獲取所有已配置的合約
 * @returns 所有合約配置的陣列
 */
export function getAllContractConfigs(): ContractConfig[] {
  const configs: ContractConfig[] = [];
  
  // 遍歷所有支援的合約類型
  const uniqueTypes = [...new Set(Object.values(CONTRACT_TYPE_MAP))];
  
  for (const contractType of uniqueTypes) {
    const config = getContractConfig(contractType);
    if (config) {
      configs.push(config);
    }
  }
  
  return configs;
}

/**
 * 根據地址查找合約類型
 * @param address 合約地址
 * @returns 合約類型，如果找不到則返回 null
 */
export function getContractTypeByAddress(address: string): string | null {
  if (!isValidContractAddress(address)) {
    return null;
  }
  
  const allConfigs = getAllContractConfigs();
  const matchingConfig = allConfigs.find(
    config => config.address.toLowerCase() === address.toLowerCase()
  );
  
  return matchingConfig?.type || null;
}

/**
 * 格式化合約地址顯示
 * @param address 完整地址
 * @param length 顯示長度（前後各幾位）
 * @returns 格式化後的地址
 */
export function formatContractAddress(address: string, length: number = 4): string {
  if (!isValidContractAddress(address)) {
    return address;
  }
  
  if (address.length <= length * 2 + 2) {
    return address;
  }
  
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
}

/**
 * 檢查合約是否支援暫停功能
 * @param contractType 合約類型
 * @returns 是否支援暫停
 */
export function supportsPausable(contractType: string): boolean {
  // 大部分 DungeonDelvers 合約都支援 Pausable
  const pausableContracts = [
    'DUNGEONCORE',
    'DUNGEONMASTER',
    'DUNGEONSTORAGE', 
    'PLAYERVAULT',
    'HERO',
    'RELIC',
    'PARTY',
    'VIPSTAKING',
    'PLAYERPROFILE',
    'ALTAROFASCENSION'
  ];
  
  const normalizedType = contractType.toUpperCase().replace(/\s+/g, '');
  const mappedType = CONTRACT_TYPE_MAP[normalizedType];
  
  return pausableContracts.includes(mappedType || '');
}

/**
 * 獲取合約的顯示名稱
 * @param contractType 合約類型
 * @returns 易讀的合約名稱
 */
export function getContractDisplayName(contractType: string): string {
  const displayNames: Record<string, string> = {
    'DUNGEONCORE': 'Dungeon Core',
    'DUNGEONMASTER': 'Dungeon Master',
    'DUNGEONSTORAGE': 'Dungeon Storage',
    'PLAYERVAULT': 'Player Vault',
    'HERO': 'Hero NFT',
    'RELIC': 'Relic NFT',
    'PARTY': 'Party NFT',
    'VIPSTAKING': 'VIP Staking',
    'PLAYERPROFILE': 'Player Profile',
    'ALTAROFASCENSION': 'Altar of Ascension',
    'ORACLE': 'Oracle',
    'SOULSHARD': 'Soul Shard',
    'USD': 'USD Token'
  };
  
  const normalizedType = contractType.toUpperCase().replace(/\s+/g, '');
  const mappedType = CONTRACT_TYPE_MAP[normalizedType];
  
  return displayNames[mappedType || ''] || contractType;
}