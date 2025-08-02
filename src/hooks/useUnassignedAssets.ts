// useUnassignedAssets.ts
// 獲取未分配到隊伍的英雄和聖物數量

import { useQuery } from '@tanstack/react-query';
import { type Address } from 'viem';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';
import { request } from 'graphql-request';

// 獲取玩家的未分配資產統計
const GET_UNASSIGNED_ASSETS_QUERY = `
  query GetUnassignedAssets($owner: ID!) {
    player(id: $owner) {
      id
      # 所有英雄（未被燒毀）
      heros(first: 500, where: { isBurned: false }) {
        id
        tokenId
      }
      # 所有聖物（未被燒毀）
      relics(first: 500, where: { isBurned: false }) {
        id
        tokenId
      }
      # 所有隊伍（未被燒毀）
      parties(first: 500, where: { isBurned: false }) {
        id
        tokenId
        heroIds
        relicIds
      }
    }
  }
`;

interface UnassignedAssets {
  unassignedHeroes: number;
  unassignedRelics: number;
  totalHeroes: number;
  totalRelics: number;
  totalParties: number;
}

/**
 * 計算未分配到隊伍的資產數量
 */
export const useUnassignedAssets = (address?: Address) => {
  return useQuery({
    queryKey: ['unassignedAssets', address],
    queryFn: async (): Promise<UnassignedAssets> => {
      if (!address) {
        return {
          unassignedHeroes: 0,
          unassignedRelics: 0,
          totalHeroes: 0,
          totalRelics: 0,
          totalParties: 0
        };
      }
      
      try {
        const data = await graphQLRateLimiter.execute(() =>
          request(THE_GRAPH_API_URL, GET_UNASSIGNED_ASSETS_QUERY, {
            owner: address.toLowerCase()
          })
        );
        
        if (!data.player) {
          return {
            unassignedHeroes: 0,
            unassignedRelics: 0,
            totalHeroes: 0,
            totalRelics: 0,
            totalParties: 0
          };
        }
        
        const { heros = [], relics = [], parties = [] } = data.player;
        
        // 收集所有已分配到隊伍的英雄 ID
        const assignedHeroIds = new Set<string>();
        parties.forEach((party: any) => {
          if (party.heroIds && Array.isArray(party.heroIds)) {
            party.heroIds.forEach((heroId: string) => {
              assignedHeroIds.add(heroId);
            });
          }
        });
        
        // 收集所有已分配到隊伍的聖物 ID
        const assignedRelicIds = new Set<string>();
        parties.forEach((party: any) => {
          if (party.relicIds && Array.isArray(party.relicIds)) {
            party.relicIds.forEach((relicId: string) => {
              assignedRelicIds.add(relicId);
            });
          }
        });
        
        // 計算未分配的英雄數量
        const unassignedHeroes = heros.filter((hero: any) => 
          !assignedHeroIds.has(hero.id)
        ).length;
        
        // 計算未分配的聖物數量
        const unassignedRelics = relics.filter((relic: any) => 
          !assignedRelicIds.has(relic.id)
        ).length;
        
        logger.debug(`Asset calculation - Total heroes: ${heros.length}, Assigned: ${assignedHeroIds.size}, Unassigned: ${unassignedHeroes}`);
        logger.debug(`Asset calculation - Total relics: ${relics.length}, Assigned: ${assignedRelicIds.size}, Unassigned: ${unassignedRelics}`);
        
        return {
          unassignedHeroes,
          unassignedRelics,
          totalHeroes: heros.length,
          totalRelics: relics.length,
          totalParties: parties.length
        };
      } catch (error) {
        logger.error('獲取未分配資產失敗:', error);
        throw error;
      }
    },
    enabled: !!address,
    staleTime: 30 * 1000, // 30 秒
  });
};