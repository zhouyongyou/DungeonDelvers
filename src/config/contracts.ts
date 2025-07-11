// src/config/contracts.ts (支援多網路最終版)

import { type Address } from 'viem';
import { bsc } from 'wagmi/chains';

// 簡化的合約地址配置 - 最終版本
const CONTRACT_ADDRESSES = {
  // 核心合約 (3個)
  CORE: {
    DUNGEON_CORE: "0xbCc8C53A0F52ad1685F4356768d88FA6ac218d66",
    ORACLE: "0x86C17E2f8940FFE6c64bf9B513656b4c51f1Ffc6", 
    PLAYER_VAULT: "0x8727c5aEd22A2cf39d183D00cC038eE600F24726"
  },
  // NFT合約 (3個)
  NFTS: {
    HERO: "0x2Cf5429dDbd2Df730a6668b50200233c76c1116F",
    RELIC: "0x548eA33d0deC74bBE9a3F0D1B5E4C660bf59E5A5",
    PARTY: "0x78dBA7671753191FFeeBEEed702Aab4F2816d70D"
  },
  // 遊戲合約 (3個)
  GAME: {
    DUNGEON_MASTER: "0xb9beF542bd333B5301846629C87363DE4FB520b7",
    ALTAR: "0x643cB4A9EF6AE813ACeeB2a1E193b6894bdf8708",
    PLAYER_PROFILE: "0x98708fFC8afaC1289639C797f5A6F095217FAFB8"
  },
  // 代幣合約 (2個)
  TOKENS: {
    SOUL_SHARD: "0xc88dAD283Ac209D77Bfe452807d378615AB8B94a",
    VIP_STAKING: "0xf1F84F3F3632fbB9be2F3d132C3660100d2C98e2"
  }
} as const;

// 簡化的合約配置
export const contracts = {
  [bsc.id]: {
    // 核心合約
    dungeonCore: { 
      address: CONTRACT_ADDRESSES.CORE.DUNGEON_CORE as Address, 
      abi: [] // 簡化：移除複雜的 ABI 定義
    },
    oracle: { 
      address: CONTRACT_ADDRESSES.CORE.ORACLE as Address, 
      abi: []
    },
    playerVault: { 
      address: CONTRACT_ADDRESSES.CORE.PLAYER_VAULT as Address, 
      abi: []
    },
    
    // NFT合約
    hero: { 
      address: CONTRACT_ADDRESSES.NFTS.HERO as Address, 
      abi: []
    },
    relic: { 
      address: CONTRACT_ADDRESSES.NFTS.RELIC as Address, 
      abi: []
    },
    party: { 
      address: CONTRACT_ADDRESSES.NFTS.PARTY as Address, 
      abi: []
    },
    
    // 遊戲合約
    dungeonMaster: { 
      address: CONTRACT_ADDRESSES.GAME.DUNGEON_MASTER as Address, 
      abi: []
    },
    altarOfAscension: { 
      address: CONTRACT_ADDRESSES.GAME.ALTAR as Address, 
      abi: []
    },
    playerProfile: { 
      address: CONTRACT_ADDRESSES.GAME.PLAYER_PROFILE as Address, 
      abi: []
    },
    
    // 代幣合約
    soulShard: { 
      address: CONTRACT_ADDRESSES.TOKENS.SOUL_SHARD as Address, 
      abi: []
    },
    vipStaking: { 
      address: CONTRACT_ADDRESSES.TOKENS.VIP_STAKING as Address, 
      abi: []
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
