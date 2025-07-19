// src/config/contracts.ts (支援多網路最終版)

import { type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { heroABI, relicABI, partyABI, vipStakingABI, playerProfileABI, playerVaultABI, soulShardTokenABI, dungeonMasterABI, altarOfAscensionABI, oracleABI, dungeonCoreABI, dungeonStorageABI } from './abis';

// 簡化的合約地址配置 - V3 版本 (2025-01-18 修復 interface 不匹配)
const CONTRACT_ADDRESSES = {
  // 核心合約 (4個) - V3 部署地址 (2025-01-18)
  CORE: {
    DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || "0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6",
    ORACLE: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS || "0x367f832fDAEFB8Bc038637a8c2E0F87521121a98", 
    PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || "0xFF7642E66DF4cc240B218b361C3e5fB14573Cf0B",
    DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || "0x6FF605478fea3C3270f2eeD550129c58Dea81403"
  },
  // NFT合約 (3個) - V3 部署地址 (2025-01-18)
  NFTS: {
    HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || "0x99658b9Aa55BFD3a8bd465c77DcCa6b1E7741dA3",
    RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || "0xF3e8546216cFdB2F0A1E886291385785177ba773",
    PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || "0xddCFa681Cee80D3a0F23834cC07D371792207C85"
  },
  // 遊戲合約 (3個) - V3 部署地址 (2025-01-18)
  GAME: {
    DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || "0x84eD128634F9334Bd63a929824066901a74a0E71",
    ALTAR: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || "0xB868842b8F4f35F6f8996aA741Fdf8a34fBBe7ED",
    PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || "0xA65334a4F4aF2f344558094bD631e75A6A7617B6"
  },
  // 代幣合約 (2個) - V3 部署地址 (2025-01-18)
  TOKENS: {
    SOUL_SHARD: import.meta.env.VITE_MAINNET_SOULSHARDTOKEN_ADDRESS || "0xc88dAD283Ac209D77Bfe452807d378615AB8B94a",
    VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || "0x39f13d0ac5EFF88544e51bdf7c338fF881E311eD"
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