import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { getQueryConfig, queryKeys } from '../config/queryConfig';
import { dedupeGraphQLQuery } from '../utils/requestDeduper';
import { logger } from '../utils/logger';

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

interface GraphQLQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  variables?: Record<string, any>;
  requiresAuth?: boolean;
  networkId?: number;
  skipCache?: boolean;
  cacheTTL?: number;
}

// 通用 GraphQL 查詢 Hook
export function useGraphQLQuery<T = any>(
  queryName: string,
  query: string,
  options: GraphQLQueryOptions<T> = {}
): UseQueryResult<T, Error> {
  const { address, chainId } = useAccount();
  const {
    variables = {},
    requiresAuth = false,
    networkId,
    skipCache = false,
    cacheTTL,
    enabled = true,
    ...queryOptions
  } = options;

  // 如果需要認證但沒有地址，禁用查詢
  const isEnabled = enabled && (!requiresAuth || !!address) && (!networkId || chainId === networkId);

  // 構建最終變數，自動注入地址
  const finalVariables = {
    ...variables,
    ...(requiresAuth && address ? { owner: address.toLowerCase() } : {}),
  };

  return useQuery<T, Error>({
    queryKey: queryKeys.graphql(queryName, finalVariables),
    queryFn: async () => {
      if (!THE_GRAPH_API_URL) {
        throw new Error('GraphQL API URL not configured');
      }

      return dedupeGraphQLQuery(
        query,
        finalVariables,
        async () => {
          logger.debug('Executing GraphQL query:', { queryName, variables: finalVariables });

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 秒超時

          try {
            const response = await fetch(THE_GRAPH_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query,
                variables: finalVariables,
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.errors) {
              logger.error('GraphQL errors:', result.errors);
              throw new Error(`GraphQL query error: ${result.errors.map((e: any) => e.message).join(', ')}`);
            }

            logger.debug('GraphQL query successful:', { queryName, dataSize: JSON.stringify(result.data).length });
            return result.data;
          } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
              throw new Error('GraphQL request timeout');
            }
            throw error;
          }
        }
      );
    },
    enabled: isEnabled,
    ...getQueryConfig('GRAPHQL'),
    ...queryOptions,
  });
}

// 玩家資產查詢
export function usePlayerAssets(options: Omit<GraphQLQueryOptions<any>, 'variables' | 'requiresAuth'> = {}) {
  const query = `
    query GetPlayerAssets($owner: ID!) {
      player(id: $owner) {
        id
        heros {
          id
          tokenId
          power
          rarity
          contractAddress
          createdAt
        }
        relics {
          id
          tokenId
          capacity
          rarity
          contractAddress
          createdAt
        }
        parties {
          id
          tokenId
          totalPower
          totalCapacity
          partyRarity
          provisionsRemaining
          cooldownEndsAt
          fatigueLevel
          unclaimedRewards
          heros { tokenId }
          relics { tokenId }
          createdAt
        }
        vip {
          id
          tokenId
          stakedAmount
          level
        }
      }
    }
  `;

  return useGraphQLQuery('playerAssets', query, {
    ...options,
    requiresAuth: true,
    networkId: 56, // BSC
  });
}

// 玩家統計查詢
export function usePlayerStats(options: Omit<GraphQLQueryOptions<any>, 'variables' | 'requiresAuth'> = {}) {
  const query = `
    query GetPlayerStats($owner: ID!) {
      player(id: $owner) {
        id
        profile {
          level
          experience
          achievementPoints
        }
        vault {
          balance
          cumulativeDeposits
          cumulativeWithdrawals
        }
        heros { id }
        relics { id }
        parties { id }
      }
    }
  `;

  return useGraphQLQuery('playerStats', query, {
    ...options,
    requiresAuth: true,
    networkId: 56,
  });
}

// 玩家隊伍查詢
export function usePlayerParties(options: Omit<GraphQLQueryOptions<any>, 'variables' | 'requiresAuth'> = {}) {
  const query = `
    query GetPlayerParties($owner: ID!) {
      player(id: $owner) {
        parties {
          id
          tokenId
          totalPower
          totalCapacity
          partyRarity
          provisionsRemaining
          cooldownEndsAt
          fatigueLevel
          unclaimedRewards
          heros { id tokenId }
          relics { id tokenId }
          createdAt
        }
      }
    }
  `;

  return useGraphQLQuery('playerParties', query, {
    ...options,
    requiresAuth: true,
    networkId: 56,
  });
}

// 全局統計查詢
export function useGlobalStats(options: Omit<GraphQLQueryOptions<any>, 'variables'> = {}) {
  const query = `
    query GetGlobalStats {
      globalStats {
        totalPlayers
        totalHeros
        totalRelics
        totalParties
        totalStakedValue
      }
    }
  `;

  return useGraphQLQuery('globalStats', query, {
    ...options,
    staleTime: 1000 * 60 * 5, // 5 分鐘
  });
}

// 排行榜查詢
export function useLeaderboard(
  type: 'level' | 'assets' | 'power',
  limit: number = 10,
  options: Omit<GraphQLQueryOptions<any>, 'variables'> = {}
) {
  const query = `
    query GetLeaderboard($limit: Int!) {
      players(
        first: $limit
        orderBy: ${type === 'level' ? 'level' : type === 'assets' ? 'totalAssets' : 'totalPower'}
        orderDirection: desc
      ) {
        id
        profile {
          level
          experience
        }
        ${type === 'assets' ? 'heros { id } relics { id } parties { id }' : ''}
        ${type === 'power' ? 'parties { totalPower }' : ''}
      }
    }
  `;

  return useGraphQLQuery(`leaderboard-${type}`, query, {
    variables: { limit },
    ...options,
    staleTime: 1000 * 60 * 2, // 2 分鐘
  });
}

// 搜索玩家
export function useSearchPlayers(
  searchTerm: string,
  options: Omit<GraphQLQueryOptions<any>, 'variables'> = {}
) {
  const query = `
    query SearchPlayers($searchTerm: String!) {
      players(
        where: { id_contains: $searchTerm }
        first: 20
      ) {
        id
        profile {
          level
          experience
        }
        heros { id }
        relics { id }
        parties { id }
      }
    }
  `;

  return useGraphQLQuery('searchPlayers', query, {
    variables: { searchTerm: searchTerm.toLowerCase() },
    enabled: searchTerm.length >= 3, // 至少 3 個字符才搜索
    ...options,
  });
}