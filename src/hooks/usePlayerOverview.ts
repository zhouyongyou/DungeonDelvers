// src/hooks/usePlayerOverview.ts
// 共用的 Hook 來獲取玩家總覽數據，避免重複代碼
// TODO: 考慮遷移到新的 Apollo Client 智能端點系統以獲得更好的性能

import { useQuery } from '@tanstack/react-query';
import { type Address } from 'viem';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';

const GET_PLAYER_OVERVIEW_QUERY = `
  query GetPlayerOverview($owner: Bytes!) {
    player(id: $owner) {
      id
      heros(first: 500, where: { isBurned: false }) {
        id
      }
      relics(first: 500, where: { isBurned: false }) {
        id
      }
      parties(first: 500, where: { isBurned: false }) {
        id
        unclaimedRewards
        heroIds
        relicIds
        totalPower
      }
      vip {
        id
        stakedAmount
        stakedAt
        unlockTime
        isUnlocking
        unlockRequestedAt
        createdAt
        lastUpdatedAt
      }
      upgradeAttempts(first: 1000, orderBy: timestamp, orderDirection: desc) {
        id
        timestamp
        outcome
        type
        baseRarity
        newRarity
        isSuccess
      }
    }
    playerProfile(id: $owner) {
      id
      name
      level
      experience
      successfulExpeditions
      totalRewardsEarned
      inviter
      invitees
      commissionEarned
      createdAt
      lastUpdatedAt
    }
    playerStats(id: $owner) {
      id
      totalExpeditions
      successfulExpeditions
      totalRewardsEarned
      highestPartyPower
    }
    playerVault(id: $owner) {
      id
      pendingRewards
      claimedRewards
      totalProvisionSpent
      lastClaimedAt
      createdAt
      lastUpdatedAt
    }
    expeditions(where: { player: $owner }, first: 1000, orderBy: timestamp, orderDirection: desc) {
      id
      success
      reward
      expGained
      timestamp
      dungeonId
      dungeonName
    }
  }
`;

export const usePlayerOverview = (address?: Address) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['playerOverview', address],
        queryFn: async () => {
            if (!address || !THE_GRAPH_API_URL) return null;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort(new DOMException('Request timeout after 10 seconds', 'TimeoutError'));
            }, 10000);
            
            try {
                const response = await graphQLRateLimiter.execute(async () => {
                    return fetch(THE_GRAPH_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: GET_PLAYER_OVERVIEW_QUERY,
                            variables: { owner: address.toLowerCase() },
                        }),
                        signal: controller.signal
                    });
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) throw new Error('Network response was not ok');
                const { data, errors } = await response.json();
                
                if (errors) {
                    logger.error('GraphQL errors:', errors);
                    throw new Error(errors[0]?.message || 'GraphQL error');
                }
                
                return data;
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    logger.error('Request aborted:', error.message || 'Timeout or manual abort');
                } else {
                    logger.error('Error fetching player overview:', error);
                }
                throw error;
            } finally {
                clearTimeout(timeoutId);
            }
        },
        enabled: !!address && !!THE_GRAPH_API_URL,
        staleTime: 30 * 1000, // 30秒快取，減少查詢頻率
        gcTime: 5 * 60 * 1000,
        refetchInterval: 60 * 1000, // 改為每60秒刷新，減少速率限制
        refetchOnWindowFocus: false, // 關閉視窗焦點刷新，避免過度查詢
    });

    return { data, isLoading, isError, refetch };
};