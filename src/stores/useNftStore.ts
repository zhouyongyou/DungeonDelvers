// src/stores/useNftStore.ts
// 全局 NFT 狀態管理 - 解決重複請求和狀態同步問題

import React from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { fetchAllOwnedNfts } from '../api/nfts';
import type { AllNftCollections, HeroNft, RelicNft, PartyNft, VipNft } from '../types/nft';
import { logger } from '../utils/logger';

interface NftState {
  // 數據狀態
  nfts: AllNftCollections | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // 用戶信息
  currentAddress: string | null;
  currentChainId: number | null;
  
  // 操作
  fetchNfts: (address: string, chainId: number) => Promise<void>;
  updateNft: (nft: HeroNft | RelicNft | PartyNft | VipNft) => void;
  removeNft: (nftType: keyof AllNftCollections, tokenId: string) => void;
  invalidate: () => void;
  clear: () => void;
  
  // 選擇器
  getNftById: (nftType: keyof AllNftCollections, tokenId: string) => any | null;
  getTotalCount: () => number;
  getByType: (nftType: keyof AllNftCollections) => any[];
}

const CACHE_DURATION = 2 * 60 * 1000; // 2分鐘緩存

export const useNftStore = create<NftState>()(
  subscribeWithSelector((set, get) => ({
    // 初始狀態
    nfts: null,
    isLoading: false,
    error: null,
    lastFetched: null,
    currentAddress: null,
    currentChainId: null,

    // 獲取 NFT 數據
    fetchNfts: async (address: string, chainId: number) => {
      const state = get();
      
      // 檢查是否需要重新獲取
      const isSameUser = state.currentAddress?.toLowerCase() === address.toLowerCase() && 
                        state.currentChainId === chainId;
      const isCacheValid = state.lastFetched && 
                          (Date.now() - state.lastFetched < CACHE_DURATION);
      
      if (isSameUser && isCacheValid && state.nfts) {
        logger.debug('Using cached NFT data');
        return;
      }

      set({ 
        isLoading: true, 
        error: null,
        currentAddress: address,
        currentChainId: chainId
      });

      try {
        logger.info(`Fetching NFTs for ${address.slice(0,6)}...${address.slice(-4)}`);
        const nftData = await fetchAllOwnedNfts(address as any, chainId);
        
        set({
          nfts: nftData,
          isLoading: false,
          error: null,
          lastFetched: Date.now(),
        });
        
        logger.info('NFT data fetched successfully:', {
          heroes: nftData.heros.length,
          relics: nftData.relics.length,
          parties: nftData.parties.length,
          vips: nftData.vipCards.length
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to fetch NFTs:', error);
        
        set({
          isLoading: false,
          error: errorMessage,
        });
      }
    },

    // 更新單個 NFT（升級後使用）
    updateNft: (updatedNft) => {
      const state = get();
      if (!state.nfts) return;

      const nftType = updatedNft.type === 'hero' ? 'heros' :
                     updatedNft.type === 'relic' ? 'relics' :
                     updatedNft.type === 'party' ? 'parties' : 'vipCards';

      const updatedNfts = {
        ...state.nfts,
        [nftType]: state.nfts[nftType].map((nft: any) => 
          nft.id === updatedNft.id ? { ...nft, ...updatedNft } : nft
        )
      };

      set({ nfts: updatedNfts });
      logger.debug(`Updated ${updatedNft.type} #${updatedNft.id}`);
    },

    // 移除 NFT（銷毀後使用）
    removeNft: (nftType, tokenId) => {
      const state = get();
      if (!state.nfts) return;

      const updatedNfts = {
        ...state.nfts,
        [nftType]: state.nfts[nftType].filter((nft: any) => 
          nft.id.toString() !== tokenId
        )
      };

      set({ nfts: updatedNfts });
      logger.debug(`Removed ${nftType} #${tokenId}`);
    },

    // 失效緩存（強制重新獲取）
    invalidate: () => {
      set({ lastFetched: null });
      logger.debug('NFT cache invalidated');
    },

    // 清空狀態（用戶登出時）
    clear: () => {
      set({
        nfts: null,
        isLoading: false,
        error: null,
        lastFetched: null,
        currentAddress: null,
        currentChainId: null,
      });
      logger.debug('NFT store cleared');
    },

    // 選擇器 - 根據 ID 獲取 NFT
    getNftById: (nftType, tokenId) => {
      const state = get();
      if (!state.nfts) return null;
      
      return state.nfts[nftType].find((nft: any) => 
        nft.id.toString() === tokenId
      ) || null;
    },

    // 選擇器 - 獲取總數量
    getTotalCount: () => {
      const state = get();
      if (!state.nfts) return 0;
      
      return state.nfts.heros.length + 
             state.nfts.relics.length + 
             state.nfts.parties.length + 
             state.nfts.vipCards.length;
    },

    // 選擇器 - 根據類型獲取 NFT
    getByType: (nftType) => {
      const state = get();
      return state.nfts?.[nftType] || [];
    },
  }))
);

// React Hook 封裝
export const useNfts = (address?: string, chainId?: number) => {
  const store = useNftStore();
  
  React.useEffect(() => {
    if (address && chainId) {
      store.fetchNfts(address, chainId);
    } else {
      store.clear();
    }
  }, [address, chainId, store.fetchNfts, store.clear]);

  return {
    nfts: store.nfts,
    isLoading: store.isLoading,
    error: store.error,
    refetch: () => {
      store.invalidate();
      if (address && chainId) {
        store.fetchNfts(address, chainId);
      }
    },
    totalCount: store.getTotalCount(),
  };
};

// 專用 Hook - 獲取特定類型的 NFT
export const useNftsByType = (nftType: keyof AllNftCollections) => {
  return useNftStore((state) => ({
    nfts: state.getByType(nftType),
    isLoading: state.isLoading,
    updateNft: state.updateNft,
    removeNft: state.removeNft,
  }));
};

// 專用 Hook - 升級後更新狀態
export const useNftUpdater = () => {
  const updateNft = useNftStore((state) => state.updateNft);
  const removeNft = useNftStore((state) => state.removeNft);
  const invalidate = useNftStore((state) => state.invalidate);
  
  return {
    updateAfterUpgrade: (nft: any) => {
      updateNft(nft);
      // 也可以選擇完全重新獲取
      // invalidate();
    },
    updateAfterBurn: (nftType: keyof AllNftCollections, tokenId: string) => {
      removeNft(nftType, tokenId);
    },
    forceRefresh: invalidate,
  };
};