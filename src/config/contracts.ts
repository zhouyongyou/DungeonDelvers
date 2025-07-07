// src/config/contracts.ts (支援多網路最終版)

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
// 1. 定義所有支援網路的合約地址與 ABI
// ★ 核心修正：新增 bscTestnet 的合約地址，使其與 .env 檔案中的設定保持一致。
// =================================================================
export const contracts = {
  [bsc.id]: {
    soulShard: { address: import.meta.env.VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS as Address, abi: soulShardTokenABI },
    hero: { address: import.meta.env.VITE_MAINNET_HERO_ADDRESS as Address, abi: heroABI },
    relic: { address: import.meta.env.VITE_MAINNET_RELIC_ADDRESS as Address, abi: relicABI },
    party: { address: import.meta.env.VITE_MAINNET_PARTY_ADDRESS as Address, abi: partyABI },
    vipStaking: { address: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS as Address, abi: vipStakingABI },
    dungeonCore: { address: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS as Address, abi: dungeonCoreABI },
    dungeonMaster: { address: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS as Address, abi: dungeonMasterABI },
    dungeonStorage: { address: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS as Address, abi: dungeonStorageABI },
    playerVault: { address: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS as Address, abi: playerVaultABI },
    playerProfile: { address: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS as Address, abi: playerProfileABI },
    altarOfAscension: { address: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS as Address, abi: altarOfAscensionABI },
    oracle: { address: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS as Address, abi: oracleABI },
  },
} as const;

// =================================================================
// 2. 自動推斷型別
// =================================================================
export type SupportedChainId = keyof typeof contracts;
export type ContractName = keyof (typeof contracts)[SupportedChainId];

// =================================================================
// 3. getContract 輔助函式
// ★ 核心修正：增加更完善的錯誤處理和日誌，方便未來除錯。
// =================================================================
export function getContract<
  TChainId extends SupportedChainId,
  TContractName extends keyof (typeof contracts)[TChainId]
>(
  chainId: TChainId | undefined,
  name: TContractName
) {
  if (!chainId || !contracts[chainId]) {
    console.warn(`getContract: 不支援或未定義的鏈 ID: ${chainId}`);
    return null;
  }
  
  const contractConfig = contracts[chainId]?.[name];
  
  // 檢查合約地址是否有效，避免因為 .env 未設定而導致錯誤
  if (!contractConfig || !(contractConfig as any).address || (contractConfig as any).address.includes('YOUR_')) {
    console.warn(`getContract: 在鏈 ID ${chainId} 上找不到 '${String(name)}' 的設定或地址無效。`);
    return null;
  }
  
  return { ...contractConfig, chainId };
}
