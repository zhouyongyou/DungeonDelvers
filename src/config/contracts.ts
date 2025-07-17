// src/config/contracts.ts (支援多網路最終版)

import { type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { heroABI, relicABI, partyABI, vipStakingABI, playerProfileABI, playerVaultABI, soulShardTokenABI, dungeonMasterABI, altarOfAscensionABI, oracleABI, dungeonCoreABI, dungeonStorageABI } from './abis';

// 簡化的合約地址配置 - 修正版本 (2025-07-17 實際部署)
const CONTRACT_ADDRESSES = {
  // 核心合約 (4個) - 實際部署地址 (2025-07-17)
  CORE: {
    DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || "0xd03d3D7456ba3B52E6E0112eBc2494dB1cB34524",
    ORACLE: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS || "0xD7e41690270Cc4f06F13eF47764F030CC4411904", 
    PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || "0x67CEecf8BE748dFd77D90D87a376Bd745B7c3c62",
    DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || "0x85Fe26dF31903A522e78eb7C853DeA7b6CF7eFa6"
  },
  // NFT合約 (3個) - 實際部署地址 (2025-07-17)
  NFTS: {
    HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || "0xB882915F4fD4C3773e0E8eeBB65088CB584A0Bdf",
    RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || "0x41cb97b903547C4190D66E818A64b7b37DE005c0",
    PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || "0x075F68Ab40A55CB4341A7dF5CFdB873696502dd0"
  },
  // 遊戲合約 (3個) - 實際部署地址 (2025-07-17)
  GAME: {
    DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || "0xd13250E0F0766006816d7AfE95EaEEc5e215d082",
    ALTAR: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || "0xdf87881b48b51380CE47Bf6B54930ef1e07471F0",
    PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || "0x7f5D359bC65F0aB07f7A874C2efF72752Fb294e5"
  },
  // 代幣合約 (2個) - 實際部署地址 (2025-07-17)
  TOKENS: {
    SOUL_SHARD: import.meta.env.VITE_MAINNET_SOULSHARDTOKEN_ADDRESS || "0xc88dAD283Ac209D77Bfe452807d378615AB8B94a",
    VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || "0x8D7Eb405247C9AD0373D398C5F63E88421ba7b49"
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
