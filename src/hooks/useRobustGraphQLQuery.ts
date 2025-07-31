// React Hook：使用強化的 GraphQL 客戶端
import { useQuery } from '@tanstack/react-query';
import { robustGraphQLQuery, indexerMonitor, getGraphSystemStatus } from '../utils/robust-graphql-client';
import { logger } from '../utils/logger';

export interface RobustQueryOptions {
  maxRetries?: number;
  retryDelay?: number;
  useCache?: boolean;
  cacheSeconds?: number;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * 強化的 GraphQL 查詢 Hook
 * 自動處理 indexer 錯誤、重試機制和緩存
 */
export function useRobustGraphQLQuery<T>(
  queryKey: any[],
  query: string,
  variables: any = {},
  options: RobustQueryOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    useCache = true,
    cacheSeconds = 180,
    enabled = true,
    staleTime = 30000, // 30 秒
    ...queryOptions
  } = options;

  return useQuery<T>({
    queryKey: [...queryKey, variables],
    queryFn: async () => {
      try {
        logger.info('🔍 執行強化 GraphQL 查詢', { 
          queryKey: queryKey.join('-'),
          variables 
        });

        const result = await robustGraphQLQuery<T>(query, variables, {
          maxRetries,
          retryDelay,
          useCache,
          cacheSeconds
        });

        if (!result) {
          throw new Error('查詢返回空結果');
        }

        return result;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        logger.error('❌ 強化查詢失敗', {
          queryKey: queryKey.join('-'),
          error: errorMessage,
          systemStatus: getGraphSystemStatus()
        });

        throw error;
      }
    },
    enabled,
    staleTime,
    retry: (failureCount, error) => {
      // 檢查是否為 indexer 錯誤
      const isIndexerError = error?.message?.includes('bad indexers') ||
                             error?.message?.includes('Unavailable') ||
                             error?.message?.includes('BadResponse');
      
      // indexer 錯誤重試更多次
      const maxRetryCount = isIndexerError ? 5 : 3;
      
      logger.warn(`🔄 React Query 重試 ${failureCount}/${maxRetryCount}`, {
        isIndexerError,
        error: error?.message
      });
      
      return failureCount < maxRetryCount;
    },
    retryDelay: (attemptIndex) => {
      // 指數退避，但有上限
      const delay = Math.min(retryDelay * Math.pow(2, attemptIndex), 30000);
      logger.info(`⏱️ 重試延遲: ${delay}ms`);
      return delay;
    },
    ...queryOptions
  });
}

/**
 * 專用的隊伍詳情查詢 Hook
 */
export function usePartyDetails(partyId: string | undefined, options: RobustQueryOptions = {}) {
  const query = `
    query GetPartyDetails($partyId: ID!) {
      party(id: $partyId) {
        id
        tokenId
        name
        totalPower
        totalCapacity
        partyRarity
        provisionsRemaining
        unclaimedRewards
        cooldownEndsAt
        heroIds
        relicIds
        heroes {
          id
          tokenId
          rarity
          power
          owner {
            id
          }
        }
        relics {
          id
          tokenId
          rarity
          capacity
          owner {
            id
          }
        }
        owner {
          id
        }
        expeditions(first: 10, orderBy: timestamp, orderDirection: desc) {
          id
          dungeonId
          dungeonName
          success
          reward
          expGained
          timestamp
          player {
            id
          }
        }
        createdAt
        lastUpdatedAt
        isBurned
      }
    }
  `;

  return useRobustGraphQLQuery(
    ['partyDetails', partyId],
    query,
    { partyId },
    {
      enabled: !!partyId,
      maxRetries: 5, // 隊伍查詢很重要，多重試
      cacheSeconds: 120, // 緩存 2 分鐘
      staleTime: 60000, // 1 分鐘內認為數據是新鮮的
      ...options
    }
  );
}

/**
 * 專用的玩家隊伍列表查詢 Hook
 */
export function usePlayerParties(playerId: string | undefined, options: RobustQueryOptions = {}) {
  const query = `
    query GetPlayerParties($playerId: ID!) {
      player(id: $playerId) {
        id
        parties(first: 20, orderBy: totalPower, orderDirection: desc) {
          id
          tokenId
          name
          totalPower
          heroIds
          relicIds
          # 基本成員信息
          heroes {
            id
            tokenId
            rarity
          }
          relics {
            id
            tokenId
            rarity
          }
          # 最近出征
          expeditions(first: 1, orderBy: timestamp, orderDirection: desc) {
            id
            success
            timestamp
            dungeonName
          }
          createdAt
          isBurned
        }
      }
    }
  `;

  return useRobustGraphQLQuery(
    ['playerParties', playerId],
    query,
    { playerId },
    {
      enabled: !!playerId,
      maxRetries: 4,
      cacheSeconds: 90, // 緩存 1.5 分鐘
      staleTime: 45000, // 45 秒內認為數據是新鮮的
      ...options
    }
  );
}

/**
 * 專用的出征歷史查詢 Hook
 */
export function useExpeditionHistory(
  playerId: string | undefined, 
  first: number = 20, 
  options: RobustQueryOptions = {}
) {
  const query = `
    query GetExpeditionHistory($playerId: ID!, $first: Int!) {
      player(id: $playerId) {
        id
        expeditions(first: $first, orderBy: timestamp, orderDirection: desc) {
          id
          dungeonId
          dungeonName
          dungeonPowerRequired
          partyPower
          success
          reward
          expGained
          timestamp
          party {
            id
            tokenId
            name
            totalPower
          }
          transactionHash
        }
      }
    }
  `;

  return useRobustGraphQLQuery(
    ['expeditionHistory', playerId, first],
    query,
    { playerId, first },
    {
      enabled: !!playerId,
      maxRetries: 3,
      cacheSeconds: 300, // 歷史數據緩存更久，5 分鐘
      staleTime: 120000, // 2 分鐘內認為數據是新鮮的
      ...options
    }
  );
}

/**
 * GraphQL 系統健康狀態 Hook
 */
export function useGraphSystemHealth() {
  return useQuery({
    queryKey: ['graphSystemHealth'],
    queryFn: () => {
      const status = getGraphSystemStatus();
      
      return {
        ...status,
        timestamp: Date.now(),
        isHealthy: status.indexer.isHealthy && status.cache.size < status.cache.maxSize * 0.8
      };
    },
    refetchInterval: 30000, // 每 30 秒檢查一次
    staleTime: 25000
  });
}

// 開發環境工具
interface WindowWithGraphQLDevTools extends Window {
  useRobustGraphQLQuery?: typeof useRobustGraphQLQuery;
  usePartyDetails?: typeof usePartyDetails;
  usePlayerParties?: typeof usePlayerParties;
  useExpeditionHistory?: typeof useExpeditionHistory;
}

if (import.meta.env.DEV) {
  const windowWithDevTools = window as WindowWithGraphQLDevTools;
  windowWithDevTools.useRobustGraphQLQuery = useRobustGraphQLQuery;
  windowWithDevTools.usePartyDetails = usePartyDetails;
  windowWithDevTools.usePlayerParties = usePlayerParties;
  windowWithDevTools.useExpeditionHistory = useExpeditionHistory;
  
  console.log('🔧 強化 GraphQL Hooks 已註冊到 window');
}