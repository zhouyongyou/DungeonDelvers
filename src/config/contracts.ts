// src/config/contracts.ts (支援多網路最終版)

import { type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { heroABI, relicABI, partyABI, vipStakingABI, playerProfileABI, playerVaultABI, soulShardTokenABI, dungeonMasterABI, altarOfAscensionABI, oracleABI, dungeonCoreABI, dungeonStorageABI } from './abis';

// 簡化的合約地址配置 - V3 版本 (2025-01-18 修復 interface 不匹配)
const CONTRACT_ADDRESSES = {
  // 核心合約 (4個) - V3 部署地址 (2025-01-18)
  CORE: {
    DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || "0xd3E55D5EdCF5255F933F5a82b10Ad4b8e4E351b7",
    ORACLE: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS || "0x5badDb15e1C91b601E4AFbDb51c57eB4e221C3b5", 
    PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || "0x2a5798D63e715F2B8b91000664f2556E794D00F2",
    DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || "0xf24571268d9CECfE27825D0257F09559Ed3a0710"
  },
  // NFT合約 (3個) - V3 部署地址 (2025-01-18)
  NFTS: {
    HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || "0x33d94b7F5E32aAdEf1BD40C529c8552f0bB6d1CB",
    RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || "0xf1A26Cbf115f62aD2a78378288b3b84f840B99ce",
    PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || "0xcB580B4F444D72853800e6e4A3e01BD919271179"
  },
  // 遊戲合約 (3個) - V3 部署地址 (2025-01-18)
  GAME: {
    DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || "0x9868D71D6f28185aA2dc949973dfe3833829e93F",
    ALTAR: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || "0x1E20794D71FE5d3ce89D00b3a5F4663C814a9cdd",
    PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || "0xD8905614a826DBBF42601380d6f467AeDCB74e07"
  },
  // 代幣合約 (2個) - V3 部署地址 (2025-01-18)
  TOKENS: {
    SOUL_SHARD: import.meta.env.VITE_MAINNET_SOULSHARDTOKEN_ADDRESS || "0xc88dAD283Ac209D77Bfe452807d378615AB8B94a",
    VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || "0x31c94D459aAdc27F69465b83cb306DFB778D46b2"
  }
} as const;

// 調試：檢查最終地址
console.log('📋 最終使用的合約地址:', {
  DUNGEONMASTER_FINAL: CONTRACT_ADDRESSES.GAME.DUNGEON_MASTER,
  SOULSHARD_FINAL: CONTRACT_ADDRESSES.TOKENS.SOUL_SHARD,
  DUNGEONCORE_FINAL: CONTRACT_ADDRESSES.CORE.DUNGEON_CORE
});

// 簡化的合約配置
export const contracts = {
  [bsc.id]: {
    // 核心合約
    dungeonCore: { 
      address: CONTRACT_ADDRESSES.CORE.DUNGEON_CORE as Address, 
      abi: dungeonCoreABI
    },
    oracle: { 
      address: CONTRACT_ADDRESSES.CORE.ORACLE as Address, 
      abi: oracleABI
    },
    playerVault: { 
      address: CONTRACT_ADDRESSES.CORE.PLAYER_VAULT as Address, 
      abi: playerVaultABI
    },
    dungeonStorage: { 
      address: CONTRACT_ADDRESSES.CORE.DUNGEON_STORAGE as Address, 
      abi: dungeonStorageABI
    },
    
    // NFT合約
    hero: { 
      address: CONTRACT_ADDRESSES.NFTS.HERO as Address, 
      abi: heroABI
    },
    relic: { 
      address: CONTRACT_ADDRESSES.NFTS.RELIC as Address, 
      abi: relicABI
    },
    party: { 
      address: CONTRACT_ADDRESSES.NFTS.PARTY as Address, 
      abi: partyABI
    },
    
    // 遊戲合約
    dungeonMaster: { 
      address: CONTRACT_ADDRESSES.GAME.DUNGEON_MASTER as Address, 
      abi: dungeonMasterABI
    },
    altarOfAscension: { 
      address: CONTRACT_ADDRESSES.GAME.ALTAR as Address, 
      abi: altarOfAscensionABI
    },
    playerProfile: { 
      address: CONTRACT_ADDRESSES.GAME.PLAYER_PROFILE as Address, 
      abi: playerProfileABI
    },
    
    // 代幣合約
    soulShard: { 
      address: CONTRACT_ADDRESSES.TOKENS.SOUL_SHARD as Address, 
      abi: soulShardTokenABI
    },
    vipStaking: { 
      address: CONTRACT_ADDRESSES.TOKENS.VIP_STAKING as Address, 
      abi: vipStakingABI
    }
  }
} as const;

// 簡化的獲取合約函數
export const getContract = (chainId: number, contractName: keyof typeof contracts[typeof bsc.id]) => {
  return contracts[chainId as keyof typeof contracts]?.[contractName];
};

// 簡化的地址獲取函數
export const getContractAddress = (contractName: keyof typeof contracts[typeof bsc.id]) => {
  return contracts[bsc.id][contractName]?.address;
};