// src/config/contracts.ts (支援多網路最終版)

import { type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { heroABI, relicABI, vipStakingABI, playerProfileABI, playerVaultABI, soulShardTokenABI, altarOfAscensionABI, oracleABI, dungeonCoreABI, dungeonStorageABI } from './abis';
import dungeonMasterV8ABI from './abis/dungeonMasterV8.json';
import partyV3ABI from './abis/partyV3.json';

// 簡化的合約地址配置 - V12 版本 (2025-01-20 更新地城配置)
const CONTRACT_ADDRESSES = {
  // 核心合約 (4個) - V12 部署地址
  CORE: {
    DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || "0x2CB2Bd1b18CDd0cbF37cD6F7FF672D03E7a038a5",
    ORACLE: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS || "0xcF7c97a055CBf8d61Bb57254F0F54A2cbaa09806", 
    PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || "0xA5BA5EE03d452eA5e57c72657c8EC03C6F388E1f",
    DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || "0xea21D782CefD785B128346F39f1574c8D6eb64C9"
  },
  // NFT合約 (3個) - V12 部署地址
  NFTS: {
    HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || "0x6f4Bd03ea8607c6e69bCc971b7d3CC9e5801EF5E",
    RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || "0x853DAAeC0ae354bF40c732C199Eb09F1a0CD3dC1",
    PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || "0x847DceaE26aF1CFc09beC195CE87a9b5701863A7"
  },
  // 遊戲合約 (3個) - V12 部署地址
  GAME: {
    DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || "0xb71f6ED7B13452a99d740024aC17470c1b4F0021",
    ALTAR: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || "0xB9878bBDcB82926f0D03E0157e8c34AEa35E06cb",
    PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || "0x39b09c3c64D5ada443d2965cb31C7bad7AC66F2f"
  },
  // 代幣合約 (2個) - V12 部署地址
  TOKENS: {
    SOUL_SHARD: import.meta.env.VITE_MAINNET_SOULSHARDTOKEN_ADDRESS || "0xc88dAD283Ac209D77Bfe452807d378615AB8B94a",
    VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || "0x738eA7A2408F56D47EF127954Db42D37aE6339D5"
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
      abi: partyV3ABI as any
    },
    
    // 遊戲合約
    dungeonMaster: { 
      address: CONTRACT_ADDRESSES.GAME.DUNGEON_MASTER as Address, 
      abi: dungeonMasterV8ABI as any
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