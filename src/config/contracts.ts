// src/config/contracts.ts (主網專注最終版)

import { bsc } from 'wagmi/chains';
import { type Address } from 'viem';
import {
  soulShardTokenABI, heroABI, relicABI, dungeonCoreABI, partyABI,
  altarOfAscensionABI, playerProfileABI, vipStakingABI, playerVaultABI,
  dungeonMasterABI, dungeonStorageABI, oracleABI,
} from './abis';

// 重新匯出 ABIs，方便其他地方統一導入
export * from './abis';

// =================================================================
// 1. 定義所有合約的地址和 ABI
// ★ 核心優化：移除測試網設定，使設定檔更簡潔，專注於主網。
// =================================================================
export const contracts = {
  [bsc.id]: {
    soulShard: { address: import.meta.env.VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS as Address, abi: soulShardTokenABI },
    hero: { address: import.meta.env.VITE_MAINNET_HERO_ADDRESS as Address, abi: heroABI },
    relic: { address: import.meta.env.VITE_MAINNET_RELIC_ADDRESS as Address, abi: relicABI },
    dungeonCore: { address: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS as Address, abi: dungeonCoreABI },
    party: { address: import.meta.env.VITE_MAINNET_PARTY_ADDRESS as Address, abi: partyABI },
    altarOfAscension: { address: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS as Address, abi: altarOfAscensionABI },
    playerProfile: { address: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS as Address, abi: playerProfileABI },
    vipStaking: { address: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS as Address, abi: vipStakingABI },
    playerVault: { address: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS as Address, abi: playerVaultABI },
    dungeonMaster: { address: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS as Address, abi: dungeonMasterABI },
    dungeonStorage: { address: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS as Address, abi: dungeonStorageABI },
    oracle: { address: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS as Address, abi: oracleABI },
  },
} as const;

// =================================================================
// 2. 自動推斷型別
// =================================================================
type SupportedChainId = keyof typeof contracts;
export type ContractName = keyof (typeof contracts)[SupportedChainId];

// =================================================================
// 3. getContract 輔助函式
// =================================================================
export function getContract<
  TChainId extends SupportedChainId,
  TContractName extends keyof (typeof contracts)[TChainId]
>(
  chainId: TChainId | undefined,
  name: TContractName
) {
  if (!chainId || !contracts[chainId]) {
    return null;
  }
  
  const contractConfig = contracts[chainId][name];
  
  if (!contractConfig || !(contractConfig as any).address) {
    return null;
  }
  
  return { ...contractConfig, chainId };
}
