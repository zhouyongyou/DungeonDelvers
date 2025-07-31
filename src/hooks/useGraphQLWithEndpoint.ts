// src/hooks/useGraphQLWithEndpoint.ts
// 智慧選擇端點的 GraphQL Hook

import { useQuery } from '@tanstack/react-query';
import { GraphQLClient } from 'graphql-request';
import { getEndpointForFeatureSync, isUsingStudioVersion } from '../config/graphql';
import { useCallback, useMemo } from 'react';

// 創建 GraphQL 客戶端的緩存
const clientCache = new Map<string, GraphQLClient>();

function getOrCreateClient(endpoint: string): GraphQLClient {
  if (!clientCache.has(endpoint)) {
    clientCache.set(endpoint, new GraphQLClient(endpoint));
  }
  return clientCache.get(endpoint)!;
}

interface UseGraphQLOptions<TData, TVariables> {
  feature: string;
  query: string;
  variables?: TVariables;
  queryKey: any[];
  enabled?: boolean;
  staleTime?: number;
  [key: string]: any; // 允許其他查詢選項
}

export function useGraphQLWithEndpoint<TData = any, TVariables = any>({
  feature,
  query,
  variables,
  queryKey,
  ...options
}: UseGraphQLOptions<TData, TVariables>) {
  // 根據功能獲取對應端點（使用同步版本，因為初始化後已有快取）
  const endpoint = useMemo(() => getEndpointForFeatureSync(feature), [feature]);
  const client = useMemo(() => getOrCreateClient(endpoint), [endpoint]);
  const hasDelay = useMemo(() => isUsingStudioVersion(feature), [feature]);
  
  // 查詢函數
  const queryFn = useCallback(async () => {
    try {
      const data = await client.request<TData>(query, variables);
      return data;
    } catch (error) {
      console.error(`GraphQL query failed for ${feature}:`, error);
      throw error;
    }
  }, [client, query, variables, feature]);
  
  // 使用 React Query
  const result = useQuery<TData>({
    queryKey: [...queryKey, feature, endpoint],
    queryFn,
    // Studio 版本緩存時間更長
    staleTime: hasDelay ? 5 * 60 * 1000 : 60 * 1000, // 5分鐘 vs 1分鐘
    cacheTime: hasDelay ? 30 * 60 * 1000 : 5 * 60 * 1000, // 30分鐘 vs 5分鐘
    ...options
  });
  
  return {
    ...result,
    hasDelay,
    endpoint,
    endpointType: hasDelay ? 'studio' : 'decentralized'
  };
}

// 使用示例 Hook
export function useExplorerData() {
  return useGraphQLWithEndpoint({
    feature: 'explorer',
    query: `
      query GetExplorerData {
        players(first: 100, orderBy: totalRewardsEarned, orderDirection: desc) {
          id
          totalRewardsEarned
          heroesOwned
        }
      }
    `,
    queryKey: ['explorer', 'players']
  });
}

export function usePartyManagement(address: string) {
  return useGraphQLWithEndpoint({
    feature: 'party-management',
    query: `
      query GetUserParties($owner: String!) {
        parties(where: { owner: $owner }) {
          id
          tokenId
          totalPower
          heroIds
          relicIds
        }
      }
    `,
    variables: { owner: address.toLowerCase() },
    queryKey: ['parties', address]
  });
}