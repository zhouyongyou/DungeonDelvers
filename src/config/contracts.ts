// src/config/contracts.ts

import { bsc, bscTestnet } from 'wagmi/chains';
import {
  soulShardTokenABI,
  heroABI,
  relicABI,
  dungeonCoreABI,
  partyABI,
  altarOfAscensionABI,
  playerProfileABI,
  vipStakingABI,
  playerVaultABI,
  dungeonMasterABI,
  dungeonStorageABI,
  oracleABI,
} from './abis';

// 重新匯出 ABIs，方便其他地方統一導入
export * from './abis';

// =================================================================
// 1. 定義所有合約的地址和 ABI
// =================================================================
export const contracts = {
  [bscTestnet.id]: {
    soulShard: { address: '0x89AF1ab41C685cDe2332C72f116751d74F49Bc3c', abi: soulShardTokenABI },
    hero: { address: '0x3eF0465a44cBfd9dCD0C171Db4a5E4E18b8B44C6', abi: heroABI },
    relic: { address: '0x3A7ad003398FF2992c8593D22B8dfc2dE83d849B', abi: relicABI },
    dungeonCore: { address: '0x4e771432EB5dDBe15B08A6D3FF518F37c6C66008', abi: dungeonCoreABI },
    party: { address: '0x6b12A3Ae454c159b2aEef6A6F8AB0A78e0f73424', abi: partyABI },
    altarOfAscension: { address: '0x278fb199c83c26c1fA263CcB5C0da624980910Fd', abi: altarOfAscensionABI },
    playerProfile: { address: '0x888cAf0c7C963800C6c3c71D4cC7cc4e086a78f6', abi: playerProfileABI },
    vipStaking: { address: '0x5ed023caD3218727d81636c3dDF3A764920Ce66a', abi: vipStakingABI },
    playerVault: { address: '0x1aC675574baeB3ec99299E84b70B19325fa337b3', abi: playerVaultABI },
    dungeonMaster: { address: '0xFB7229320C6B3d19D62D7dfCb4498BC1fCB5fE92', abi: dungeonMasterABI },
    dungeonStorage: { address: '0x6606bABeE8C1Cd2513F048eFC0037dFFEF33A31e', abi: dungeonStorageABI },
    oracle: { address: '0xfD9Df1Df0C8c47F04305AB594CcEfA0D1A6A54BF', abi: oracleABI },
  },
  [bsc.id]: {
    soulShard: { address: '0xYOUR_MAINNET_SOULSHARD_ADDRESS', abi: soulShardTokenABI },
    hero: { address: '0xYOUR_MAINNET_HERO_ADDRESS', abi: heroABI },
    relic: { address: '0xYOUR_MAINNET_RELIC_ADDRESS', abi: relicABI },
    dungeonCore: { address: '0xYOUR_MAINNET_DUNGEONCORE_ADDRESS', abi: dungeonCoreABI },
    party: { address: '0xYOUR_MAINNET_PARTY_ADDRESS', abi: partyABI },
    altarOfAscension: { address: '0xYOUR_MAINNET_ALTAR_ADDRESS', abi: altarOfAscensionABI },
    playerProfile: { address: '0xYOUR_MAINNET_PLAYERPROFILE_ADDRESS', abi: playerProfileABI },
    vipStaking: { address: '0xYOUR_MAINNET_VIPSTAKING_ADDRESS', abi: vipStakingABI },
    playerVault: { address: '0xYOUR_MAINNET_PLAYERVAULT_ADDRESS', abi: playerVaultABI },
    dungeonMaster: { address: '0xYOUR_MAINNET_DUNGEONMASTER_ADDRESS', abi: dungeonMasterABI },
    dungeonStorage: { address: '0xYOUR_MAINNET_DUNGEONSTORAGE_ADDRESS', abi: dungeonStorageABI },
    oracle: { address: '0xYOUR_MAINNET_ORACLE_ADDRESS', abi: oracleABI },
  },
} as const;


// =================================================================
// 2. 自動推斷型別 (保持不變)
// =================================================================
type SupportedChainId = keyof typeof contracts;
export type ContractName = keyof (typeof contracts)[SupportedChainId];


// =================================================================
// 3. getContract 函式 (保持不變)
// =================================================================
export function getContract<
  TChainId extends SupportedChainId,
  TContractName extends keyof (typeof contracts)[TChainId]
>(
  chainId: TChainId | undefined,
  name: TContractName
): (typeof contracts)[TChainId][TContractName] | null {
  if (!chainId || !contracts[chainId]) {
    return null;
  }
  
  const contractConfig = contracts[chainId][name];
  
  // ★★★ 核心修正 ★★★
  // 移除危險的型別斷言，改用更安全的屬性檢查
  if (!contractConfig || typeof (contractConfig as any).address !== 'string' || (contractConfig as any).address.includes('YOUR_')) {
    // console.warn(`合約 "${String(name)}" 在 chainId ${chainId} 的地址尚未設定。`);
    return null;
  }
  
  return contractConfig;
}
