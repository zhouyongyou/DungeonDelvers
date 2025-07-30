// src/hooks/usePlayerAssetsWithPagination.ts
// 支援分頁查詢的玩家資產 Hook

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { type Address } from 'viem';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';
import { request } from 'graphql-request';

const PAGE_SIZE = 500; // 平衡性能和請求大小的最佳選擇

// 查詢所有英雄（支援分頁）
const GET_ALL_HEROES_QUERY = `
  query GetAllHeroes($owner: String!, $skip: Int!, $first: Int!) {
    heros(
      where: { owner: $owner, isBurned: false }
      skip: $skip
      first: $first
      orderBy: tokenId
      orderDirection: asc
    ) {
      id
      tokenId
      power
      rarity
      createdAt
      lastUpgradedAt
    }
  }
`;

// 查詢所有聖物（支援分頁）
const GET_ALL_RELICS_QUERY = `
  query GetAllRelics($owner: String!, $skip: Int!, $first: Int!) {
    relics(
      where: { owner: $owner, isBurned: false }
      skip: $skip
      first: $first
      orderBy: tokenId
      orderDirection: asc
    ) {
      id
      tokenId
      capacity
      rarity
      createdAt
      lastUpgradedAt
    }
  }
`;

// 查詢所有隊伍（支援分頁）
const GET_ALL_PARTIES_QUERY = `
  query GetAllParties($owner: String!, $skip: Int!, $first: Int!) {
    parties(
      where: { owner: $owner, isBurned: false }
      skip: $skip
      first: $first
      orderBy: tokenId
      orderDirection: asc
    ) {
      id
      tokenId
      name
      totalPower
      totalCapacity
      partyRarity
      unclaimedRewards
      cooldownEndsAt
      provisionsRemaining
      fatigueLevel
    }
  }
`;

// 獲取資產統計數據
const GET_ASSET_STATS_QUERY = `
  query GetAssetStats($owner: ID!) {
    player(id: $owner) {
      id
      stats {
        totalHeroes
        totalRelics
        totalParties
      }
    }
  }
`;

interface AssetStats {
  totalHeroes: number;
  totalRelics: number;
  totalParties: number;
}

/**
 * 獲取玩家資產統計數據
 */
export const usePlayerAssetStats = (address?: Address) => {
  return useQuery({
    queryKey: ['playerAssetStats', address],
    queryFn: async () => {
      if (!address) return null;
      
      try {
        const data = await graphQLRateLimiter(() =>
          request(THE_GRAPH_API_URL, GET_ASSET_STATS_QUERY, {
            owner: address.toLowerCase()
          })
        );
        
        return data.player?.stats || {
          totalHeroes: 0,
          totalRelics: 0,
          totalParties: 0
        };
      } catch (error) {
        logger.error('獲取資產統計失敗:', error);
        throw error;
      }
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });
};

/**
 * 分頁獲取所有資產的通用函數
 */
async function fetchAllAssets<T>(
  query: string,
  owner: string,
  assetType: string
): Promise<T[]> {
  const allAssets: T[] = [];
  let skip = 0;
  let hasMore = true;
  
  logger.info(`開始獲取所有 ${assetType}...`);
  
  while (hasMore) {
    try {
      const data = await graphQLRateLimiter(() =>
        request(THE_GRAPH_API_URL, query, {
          owner: owner.toLowerCase(),
          skip,
          first: PAGE_SIZE
        })
      );
      
      const assets = data[assetType] || [];
      allAssets.push(...assets);
      
      logger.debug(`獲取了 ${assets.length} 個 ${assetType}（總計: ${allAssets.length}）`);
      
      // 如果返回的數量少於 PAGE_SIZE，說明沒有更多數據了
      hasMore = assets.length === PAGE_SIZE;
      skip += PAGE_SIZE;
      
      // 防止無限循環（最多查詢 10000 個）
      if (skip >= 10000) {
        logger.warn(`${assetType} 數量超過 10000，停止查詢`);
        hasMore = false;
      }
    } catch (error) {
      logger.error(`獲取 ${assetType} 失敗:`, error);
      throw error;
    }
  }
  
  logger.info(`完成獲取 ${assetType}，總計: ${allAssets.length} 個`);
  return allAssets;
}

/**
 * 獲取玩家的所有英雄（支援超過 100 個）
 */
export const useAllPlayerHeroes = (address?: Address) => {
  return useQuery({
    queryKey: ['allPlayerHeroes', address],
    queryFn: async () => {
      if (!address) return [];
      return fetchAllAssets(GET_ALL_HEROES_QUERY, address, 'heros');
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 獲取玩家的所有聖物（支援超過 100 個）
 */
export const useAllPlayerRelics = (address?: Address) => {
  return useQuery({
    queryKey: ['allPlayerRelics', address],
    queryFn: async () => {
      if (!address) return [];
      return fetchAllAssets(GET_ALL_RELICS_QUERY, address, 'relics');
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 獲取玩家的所有隊伍（支援超過 100 個）
 */
export const useAllPlayerParties = (address?: Address) => {
  return useQuery({
    queryKey: ['allPlayerParties', address],
    queryFn: async () => {
      if (!address) return [];
      return fetchAllAssets(GET_ALL_PARTIES_QUERY, address, 'parties');
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 使用無限查詢來實現虛擬滾動（適用於 UI 展示）
 */
export const useInfinitePlayerAssets = (
  address?: Address,
  assetType: 'heros' | 'relics' | 'parties' = 'heros'
) => {
  const queryMap = {
    heros: GET_ALL_HEROES_QUERY,
    relics: GET_ALL_RELICS_QUERY,
    parties: GET_ALL_PARTIES_QUERY
  };
  
  return useInfiniteQuery({
    queryKey: ['infinitePlayerAssets', address, assetType],
    queryFn: async ({ pageParam = 0 }) => {
      if (!address) return { items: [], nextCursor: null };
      
      const data = await graphQLRateLimiter(() =>
        request(THE_GRAPH_API_URL, queryMap[assetType], {
          owner: address.toLowerCase(),
          skip: pageParam,
          first: PAGE_SIZE
        })
      );
      
      const items = data[assetType] || [];
      
      return {
        items,
        nextCursor: items.length === PAGE_SIZE ? pageParam + PAGE_SIZE : null
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });
};