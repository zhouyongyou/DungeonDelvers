// src/hooks/useSmartPreloader.ts
// 智能預載入系統 - 預測用戶行為並提前載入數據

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { fetchAllOwnedNfts } from '../api/nfts';
import { logger } from '../utils/logger';

interface PreloadStrategy {
  // 預載入優先級
  priority: 'high' | 'medium' | 'low';
  // 觸發條件
  triggers: string[];
  // 預載入的數據
  queryKey: string[];
  queryFn: () => Promise<any>;
}

export const useSmartPreloader = (userAddress?: string, chainId?: number) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const preloadedPages = useRef(new Set<string>());

  // 定義預載入策略
  const strategies: PreloadStrategy[] = [
    // 用戶在首頁時，預載入資產數據
    {
      priority: 'high',
      triggers: ['/', '/overview'],
      queryKey: ['ownedNfts', userAddress],
      queryFn: () => userAddress ? fetchAllOwnedNfts(userAddress as any, chainId || 56) : Promise.resolve(null)
    },
    
    // 用戶在資產頁面時，預載入地下城相關數據
    {
      priority: 'medium', 
      triggers: ['/assets', '/my-assets'],
      queryKey: ['playerParties', userAddress, chainId],
      queryFn: async () => {
        // 預載入地下城需要的隊伍數據
        if (!userAddress) return null;
        // 這裡可以預載入 DungeonPage 需要的數據
        return null;
      }
    },
    
    // 用戶在地下城頁面時，預載入升級相關數據  
    {
      priority: 'medium',
      triggers: ['/dungeon', '/expedition'],
      queryKey: ['upgradeStats', userAddress],
      queryFn: async () => {
        // 預載入升級成功率等數據
        return null;
      }
    }
  ];

  // 智能預載入邏輯
  useEffect(() => {
    if (!userAddress || !chainId) return;

    const currentPath = router.pathname;
    const applicableStrategies = strategies.filter(strategy => 
      strategy.triggers.some(trigger => currentPath.startsWith(trigger))
    );

    applicableStrategies.forEach(strategy => {
      const cacheKey = strategy.queryKey.join('-');
      
      // 避免重複預載入
      if (preloadedPages.current.has(cacheKey)) return;
      
      // 檢查數據是否已在緩存中
      const cachedData = queryClient.getQueryData(strategy.queryKey);
      if (cachedData) return;

      // 根據優先級決定延遲時間
      const delay = strategy.priority === 'high' ? 100 : 
                   strategy.priority === 'medium' ? 500 : 1000;

      setTimeout(() => {
        logger.debug(`Preloading data for ${cacheKey}`);
        
        queryClient.prefetchQuery({
          queryKey: strategy.queryKey,
          queryFn: strategy.queryFn,
          staleTime: 2 * 60 * 1000, // 2分鐘
        }).then(() => {
          preloadedPages.current.add(cacheKey);
          logger.debug(`Successfully preloaded ${cacheKey}`);
        }).catch((error) => {
          logger.warn(`Failed to preload ${cacheKey}:`, error);
        });
      }, delay);
    });
  }, [router.pathname, userAddress, chainId, queryClient]);

  // 清理函數
  useEffect(() => {
    return () => {
      preloadedPages.current.clear();
    };
  }, [userAddress]);
};

// 專門用於 NFT 數據的預載入
export const useNftPreloader = () => {
  const queryClient = useQueryClient();
  
  return {
    // 預載入特定 NFT 的詳細數據
    preloadNftDetails: async (nftType: string, tokenId: string) => {
      const queryKey = [`${nftType}Details`, tokenId];
      
      // 檢查是否已緩存
      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData) return;

      // 預載入邏輯 - 可以是 metadata、升級歷史等
      queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          // 這裡實現具體的預載入邏輯
          return null;
        },
        staleTime: 5 * 60 * 1000,
      });
    },

    // 批量預載入最常查看的 NFT
    preloadTopNfts: async (nfts: any[], limit: number = 5) => {
      // 根據某種排序邏輯（最近查看、最高戰力等）選擇 top NFT
      const topNfts = nfts
        .sort((a, b) => (b.power || 0) - (a.power || 0))
        .slice(0, limit);

      topNfts.forEach(nft => {
        setTimeout(() => {
          // 預載入這些 NFT 的詳細信息
        }, Math.random() * 1000); // 隨機延遲避免同時請求
      });
    }
  };
};