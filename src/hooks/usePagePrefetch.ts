import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { queryKeys } from '../config/queryConfig';
import { fetchAllOwnedNfts } from '../api/nfts';
import { logger } from '../utils/logger';
import type { Page } from '../types/page';

// 頁面間的預取策略
const prefetchStrategies: Record<string, string[]> = {
  // 從 dashboard 可能前往的頁面
  'dashboard': ['party', 'dungeon', 'mint'],
  // 從 mint 可能前往的頁面
  'mint': ['party', 'dashboard'],
  // 從 party 可能前往的頁面
  'party': ['dungeon', 'dashboard'],
  // 從 dungeon 可能前往的頁面
  'dungeon': ['party'],
};

export function usePagePrefetch(currentPage: Page) {
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();

  useEffect(() => {
    if (!address || !chainId) return;

    const pagesToPrefetch = prefetchStrategies[currentPage] || [];

    logger.debug('Prefetching pages:', pagesToPrefetch);

    // 為每個可能的目標頁面預取數據
    pagesToPrefetch.forEach(page => {
      switch (page) {
        case 'party':
        case 'dashboard':
          // 預取 NFT 數據
          queryClient.prefetchQuery({
            queryKey: queryKeys.ownedNfts(address, chainId),
            queryFn: () => fetchAllOwnedNfts(address, chainId),
            staleTime: 1000 * 60 * 30, // 30 分鐘
          });
          break;

        case 'dungeon':
          // 預取隊伍數據
          queryClient.prefetchQuery({
            queryKey: queryKeys.playerParties(address),
            queryFn: async () => {
              // 這裡應該是實際的 GraphQL 查詢
              return [];
            },
            staleTime: 1000 * 60 * 5, // 5 分鐘
          });
          break;

      }
    });
  }, [currentPage, address, chainId, queryClient]);
}

// 鼠標懸停預取
export function usePrefetchOnHover() {
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();

  const prefetchNftData = () => {
    if (!address || !chainId) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.ownedNfts(address, chainId),
      queryFn: () => fetchAllOwnedNfts(address, chainId),
      staleTime: 1000 * 60 * 30,
    });
  };

  const prefetchPlayerData = () => {
    if (!address) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.playerData(address),
      queryFn: async () => {
        // Player data fetch logic
        return {};
      },
      staleTime: 1000 * 60 * 5,
    });
  };

  return {
    prefetchNftData,
    prefetchPlayerData,
  };
}