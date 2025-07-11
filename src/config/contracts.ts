// src/config/contracts.ts (支援多網路最終版)

import { type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { heroABI, relicABI, partyABI, vipStakingABI, playerProfileABI, playerVaultABI, soulShardTokenABI, dungeonMasterABI, altarOfAscensionABI, oracleABI, dungeonCoreABI, dungeonStorageABI } from './abis';

// 簡化的合約地址配置 - 最終版本 (2024-12-19 重新部署)
const CONTRACT_ADDRESSES = {
  // 核心合約 (4個)
  CORE: {
    DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || "0xC11D98507Cd0007B655e12B0fe89b87E65d89E1F",
    ORACLE: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS || "0x44C6a943939a59F4DB07DD3348E87B3527244Bcd", 
    PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || "0x4fE1e22A210d26fC40f8D6fA98A21d919793C282",
    DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || "0xD29964Bd097Ad056652DBDd1c32D621d71B953f3"
  },
  // NFT合約 (3個)
  NFTS: {
    HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || "0xe439b1aC9100732F33C757746AD916ADE6967C79",
    RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || "0x0a03BE7555f8B0f1F2299c4C8DCE1b8d82b2B8B4",
    PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || "0x21326106f2D41E4d31B724B3316C780069F9274A"
  },
  // 遊戲合約 (3個)
  GAME: {
    DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || "0xD7CF07D71E0440B5cC8e2faAF3bbbc9C3588898F",
    ALTAR: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || "0x5186C497C7fB40Bf2B18191404E01Dd43b387cF2",
    PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || "0xA19F45fC6372Ec8111E99399876e448Af05Fa735"
  },
  // 代幣合約 (2個)
  TOKENS: {
    SOUL_SHARD: import.meta.env.VITE_MAINNET_SOULSHARDTOKEN_ADDRESS || "0xc88dAD283Ac209D77Bfe452807d378615AB8B94a",
    VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || "0x77D81358C33c24282Ce183f00bFDE590dCc3915F"
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
