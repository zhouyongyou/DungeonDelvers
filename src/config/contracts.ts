// src/config/contracts.ts (支援多網路最終版)

import { type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import { heroABI, relicABI, partyABI, vipStakingABI, playerProfileABI, playerVaultABI, soulShardTokenABI, dungeonMasterABI, altarOfAscensionABI, oracleABI, dungeonCoreABI, dungeonStorageABI } from './abis';

// 簡化的合約地址配置 - 最終版本 (2025-07-14 重新部署)
const CONTRACT_ADDRESSES = {
  // 核心合約 (4個)
  CORE: {
    DUNGEON_CORE: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS || "0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6",
    ORACLE: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS || "0xFa2255D806C62a68e8b2F4a7e20f3E8aE9a15c06", 
    PLAYER_VAULT: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS || "0x294Fb94d5a543cd77c9932fD34282462a74bFf1A",
    DUNGEON_STORAGE: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || "0x40D0DFA394707e26247a1EFfAe0f9C1b248Fff10"
  },
  // NFT合約 (3個)
  NFTS: {
    HERO: import.meta.env.VITE_MAINNET_HERO_ADDRESS || "0x929a4187a462314fCC480ff547019fA122A283f0",
    RELIC: import.meta.env.VITE_MAINNET_RELIC_ADDRESS || "0x1067295025D21f59C8AcB5E777E42F3866a6D2fF",
    PARTY: import.meta.env.VITE_MAINNET_PARTY_ADDRESS || "0xE0272e1D76de1F789ce0996F3226bCf54a8c7735"
  },
  // 遊戲合約 (3個)
  GAME: {
    DUNGEON_MASTER: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS || "0x4424BAE8E132DC83A2F39c76Bc2d9dD44E4A47B0",
    ALTAR: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS || "0xD26444ec19e567B872824fe0B9c104e45A3a3341",
    PLAYER_PROFILE: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS || "0xBba4fE0b9Ac0b16786986aF0F39535B37D09Ff1F"
  },
  // 代幣合約 (2個)
  TOKENS: {
    SOUL_SHARD: import.meta.env.VITE_MAINNET_SOULSHARDTOKEN_ADDRESS || "0xc88dAD283Ac209D77Bfe452807d378615AB8B94a",
    VIP_STAKING: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS || "0x7aBEA5b90528a19580A0a2A83e4CF9AD4871880F"
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
