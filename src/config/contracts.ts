// src/config/contracts.ts

import { bsc, bscTestnet } from 'wagmi/chains';
import { type Address } from 'viem';
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
// ★ 核心修改：為主網和測試網的 SoulShard 代幣使用不同的環境變數
// =================================================================
export const contracts = {
  [bscTestnet.id]: {
    soulShard: { address: import.meta.env.VITE_TESTNET_SOUL_SHARD_TOKEN_ADDRESS as Address, abi: soulShardTokenABI },
    hero: { address: import.meta.env.VITE_TESTNET_HERO_ADDRESS as Address, abi: heroABI },
    relic: { address: import.meta.env.VITE_TESTNET_RELIC_ADDRESS as Address, abi: relicABI },
    dungeonCore: { address: import.meta.env.VITE_TESTNET_DUNGEONCORE_ADDRESS as Address, abi: dungeonCoreABI },
    party: { address: import.meta.env.VITE_TESTNET_PARTY_ADDRESS as Address, abi: partyABI },
    altarOfAscension: { address: import.meta.env.VITE_TESTNET_ALTAROFASCENSION_ADDRESS as Address, abi: altarOfAscensionABI },
    playerProfile: { address: import.meta.env.VITE_TESTNET_PLAYERPROFILE_ADDRESS as Address, abi: playerProfileABI },
    vipStaking: { address: import.meta.env.VITE_TESTNET_VIPSTAKING_ADDRESS as Address, abi: vipStakingABI },
    playerVault: { address: import.meta.env.VITE_TESTNET_PLAYERVAULT_ADDRESS as Address, abi: playerVaultABI },
    dungeonMaster: { address: import.meta.env.VITE_TESTNET_DUNGEONMASTER_ADDRESS as Address, abi: dungeonMasterABI },
    dungeonStorage: { address: import.meta.env.VITE_TESTNET_DUNGEONSTORAGE_ADDRESS as Address, abi: dungeonStorageABI },
    oracle: { address: import.meta.env.VITE_TESTNET_ORACLE_ADDRESS as Address, abi: oracleABI },
  },
  [bsc.id]: {
    soulShard: { address: import.meta.env.VITE_SOUL_SHARD_TOKEN_ADDRESS as Address, abi: soulShardTokenABI },
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
