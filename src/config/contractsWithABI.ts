// contractsWithABI.ts - 完整的合約配置，包含地址和 ABI
// 用於鑄造頁面等需要完整合約配置的地方

import { CONTRACT_ADDRESSES, LEGACY_CONTRACT_NAMES } from './contracts';

// 重新導出 CONTRACT_ADDRESSES 以供其他文件使用
export { CONTRACT_ADDRESSES, LEGACY_CONTRACT_NAMES };
export type { ContractName } from './contracts';
// 直接從 JSON 檔案導入 ABI
import heroABI from '../abis/Hero.json';
import relicABI from '../abis/Relic.json';
import partyV3ABI from '../abis/Party.json';
import dungeonCoreABI from '../abis/DungeonCore.json';
import dungeonMasterABI from '../abis/DungeonMaster.json';
import playerProfileABI from '../abis/PlayerProfile.json';
import vipStakingABI from '../abis/VIPStaking.json';
import oracleABI from '../abis/Oracle.json';
import altarOfAscensionABI from '../abis/AltarOfAscension.json';
import playerVaultABI from '../abis/PlayerVault.json';
import dungeonStorageABI from '../abis/DungeonStorage.json';

// 導入 SoulShard Token ABI
import soulShardTokenABI from '../abis/SoulShardToken.json';

export interface ContractConfig {
  address: `0x${string}`;
  abi: any;
  name: string;
}

// 合約 ABI 映射 - 處理 Hardhat artifact 格式
const CONTRACT_ABIS = {
  hero: heroABI.abi || heroABI,
  relic: relicABI.abi || relicABI,
  party: partyV3ABI.abi || partyV3ABI,
  soulShard: soulShardTokenABI.abi || soulShardTokenABI,
  playerVault: playerVaultABI.abi || playerVaultABI,
  dungeonCore: dungeonCoreABI.abi || dungeonCoreABI,
  dungeonMaster: dungeonMasterABI.abi || dungeonMasterABI,
  playerProfile: playerProfileABI.abi || playerProfileABI,
  vipStaking: vipStakingABI.abi || vipStakingABI,
  oracle: oracleABI.abi || oracleABI,
  altarOfAscension: altarOfAscensionABI.abi || altarOfAscensionABI,
  dungeonStorage: dungeonStorageABI.abi || dungeonStorageABI,
  // 添加測試代幣的 ABI 映射
  testUsd: soulShardTokenABI.abi || soulShardTokenABI, // TestUSD 使用標準 ERC20 ABI
  soulShardToken: soulShardTokenABI.abi || soulShardTokenABI // 明確的 soulShard 映射
} as const;

/**
 * 獲取包含 ABI 的完整合約配置
 * @param chainId - 鏈 ID (目前只支援 BSC 主網 56)
 * @param contractType - 合約類型
 * @returns 完整的合約配置或 undefined
 */
export function getContractWithABI(
  chainId: number, 
  contractType: keyof typeof CONTRACT_ABIS | keyof typeof LEGACY_CONTRACT_NAMES
): ContractConfig | undefined {
  // 只支援 BSC 主網
  if (chainId !== 56) {
    return undefined;
  }

  // 處理 legacy 名稱映射 - 直接使用原始名稱作為 ABI 鍵
  const finalContractType = contractType as keyof typeof CONTRACT_ABIS;

  // 獲取地址 - 使用 legacy 映射來獲取正確的常數名稱
  let address: string | undefined;
  if (contractType in LEGACY_CONTRACT_NAMES) {
    const addressKey = LEGACY_CONTRACT_NAMES[contractType as keyof typeof LEGACY_CONTRACT_NAMES];
    address = CONTRACT_ADDRESSES[addressKey as keyof typeof CONTRACT_ADDRESSES];
  } else {
    // 直接映射，如果不在 legacy 中
    switch (finalContractType) {
      case 'soulShard':
        address = CONTRACT_ADDRESSES.SOULSHARD;
        break;
      case 'hero':
        address = CONTRACT_ADDRESSES.HERO;
        break;
      case 'relic':
        address = CONTRACT_ADDRESSES.RELIC;
        break;
      case 'party':
        address = CONTRACT_ADDRESSES.PARTY;
        break;
      case 'playerVault':
        address = CONTRACT_ADDRESSES.PLAYERVAULT;
        break;
      case 'dungeonCore':
        address = CONTRACT_ADDRESSES.DUNGEONCORE;
        break;
      case 'dungeonMaster':
        address = CONTRACT_ADDRESSES.DUNGEONMASTER;
        break;
      case 'playerProfile':
        address = CONTRACT_ADDRESSES.PLAYERPROFILE;
        break;
      case 'vipStaking':
        address = CONTRACT_ADDRESSES.VIPSTAKING;
        break;
      case 'oracle':
        address = CONTRACT_ADDRESSES.ORACLE;
        break;
      case 'altarOfAscension':
        address = CONTRACT_ADDRESSES.ALTAROFASCENSION;
        break;
      case 'dungeonStorage':
        address = CONTRACT_ADDRESSES.DUNGEONSTORAGE;
        break;
      case 'testUsd':
        // USD 合約在 V24 版本中不存在，暫時返回 undefined
        address = undefined;
        break;
      case 'soulShardToken':
        address = CONTRACT_ADDRESSES.SOULSHARD;
        break;
    }
  }

  // 獲取 ABI
  const abi = CONTRACT_ABIS[finalContractType];

  if (!address || !abi || address === '0x0000000000000000000000000000000000000000') {
    return undefined;
  }

  return {
    address: address as `0x${string}`,
    abi,
    name: finalContractType
  };
}

/**
 * Legacy 兼容函數 - 替代原來的 getContractLegacy
 * 這個函數現在返回完整的合約配置，包含 ABI
 */
export function getContractLegacy(
  chainId: number, 
  legacyName: keyof typeof LEGACY_CONTRACT_NAMES
): ContractConfig | undefined {
  return getContractWithABI(chainId, legacyName);
}

// 導出常用的合約配置獲取函數
export const getHeroContract = (chainId: number) => getContractWithABI(chainId, 'hero');
export const getRelicContract = (chainId: number) => getContractWithABI(chainId, 'relic');
export const getPartyContract = (chainId: number) => getContractWithABI(chainId, 'party');
export const getSoulShardContract = (chainId: number) => getContractWithABI(chainId, 'soulShard');
export const getPlayerVaultContract = (chainId: number) => getContractWithABI(chainId, 'playerVault');
export const getDungeonCoreContract = (chainId: number) => getContractWithABI(chainId, 'dungeonCore');
export const getDungeonMasterContract = (chainId: number) => getContractWithABI(chainId, 'dungeonMaster');
export const getPlayerProfileContract = (chainId: number) => getContractWithABI(chainId, 'playerProfile');
export const getVipStakingContract = (chainId: number) => getContractWithABI(chainId, 'vipStaking');
export const getOracleContract = (chainId: number) => getContractWithABI(chainId, 'oracle');
export const getAltarOfAscensionContract = (chainId: number) => getContractWithABI(chainId, 'altarOfAscension');
export const getDungeonStorageContract = (chainId: number) => getContractWithABI(chainId, 'dungeonStorage');