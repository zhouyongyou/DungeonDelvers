// src/hooks/usePlayerOverview.ts
// 共用的 Hook 來獲取玩家總覽數據，避免重複代碼

import { useQuery } from '@tanstack/react-query';
import { type Address } from 'viem';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';

const GET_PLAYER_OVERVIEW_QUERY = `
  query GetPlayerOverview($owner: ID!) {
    player(id: $owner) {
      id
      profile {
        id
        level
        experience
        name
        successfulExpeditions
        totalRewardsEarned
        inviter
        commissionEarned
        createdAt
        lastUpdatedAt
      }
      heros {
        id
      }
      relics {
        id
      }
      parties {
        id
        unclaimedRewards
      }
      vip {
        id
        tier
        stakingAmount
      }
      vault {
        id
        pendingRewards
      }
      stats {
        totalHeroes
        totalRelics
        totalParties
        totalExpeditions
        successfulExpeditions
        totalRewardsEarned
        highestPartyPower
        totalUpgradeAttempts
      }
    }
    playerVaults(where: { owner: $owner }) {
      id
      pendingRewards
      claimedRewards
    }
  }
`;

export const usePlayerOverview = (address?: Address) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['playerOverview', address],
        queryFn: async () => {
            if (!address || !THE_GRAPH_API_URL) return null;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
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
                logger.error('Error fetching player overview:', error);
                throw error;
            }
        },
        enabled: !!address && !!THE_GRAPH_API_URL,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchInterval: 60 * 1000,
    });

    return { data, isLoading, isError, refetch };
};