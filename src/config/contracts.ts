// src/config/contracts.ts (支援多網路最終版)

import { type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { heroABI, relicABI, partyABI, vipStakingABI, playerProfileABI, playerVaultABI, soulShardTokenABI, dungeonMasterABI, altarOfAscensionABI, oracleABI, dungeonCoreABI, dungeonStorageABI } from './abis';

// 簡化的合約地址配置 - 最終版本 (2025-07-14 重新部署)
const CONTRACT_ADDRESSES = {
  // 核心合約 (4個)
  CORE: {
    DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || "0x548A15CaFAE2a5D19f9683CDad6D57e3320E61a7",
    ORACLE: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS || "0xB75BB304AaBfB12B3A428BE77d6a0A9052671925", 
    PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || "0x172cd598bC04609056e643Bba5430ceA9641aD3B",
    DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || "0xEC6773F9C52446BB2F8318dBBa09f58E72fe91b4"
  },
  // NFT合約 (3個)
  NFTS: {
    HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || "0xaa3166b87648F10E7C8A59f000E48d21A1A048C1",
    RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || "0x7023E506A9AD9339D5150c1c9F767A422066D3Df",
    PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || "0xb069B70d61f96bE5f5529dE216538766672f1096"
  },
  // 遊戲合約 (3個)
  GAME: {
    DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || "0x8550ACe3B6C9Ef311B995678F9263A69bC00EC3A",
    ALTAR: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || "0x66bf56FBec308E5f2713C4B96CE8e4B02fD3ae8B",
    PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || "0x861CFCA7af4E6005884CF3fE89C2a5Cf3d6F3c85"
  },
  // 代幣合約 (2個)
  TOKENS: {
    SOUL_SHARD: import.meta.env.VITE_MAINNET_SOULSHARDTOKEN_ADDRESS || "0xc88dAD283Ac209D77Bfe452807d378615AB8B94a",
    VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || "0x769C47058c786A9d1b0948922Db70A56394c96FD"
  }
} as const;

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
