// useRealtimePartyStatus.ts - 即時隊伍狀態 Hook

import { useSubscription, useQuery } from '@apollo/client';
import { PARTY_STATUS_SUBSCRIPTION } from '../graphql/subscriptions';
import { gql } from '@apollo/client';
import { logger } from '../utils/logger';
import { useEffect, useState } from 'react';
import { connectionStatus } from '../config/apolloClient';

// 查詢用於初始數據和降級
const PARTY_STATUS_QUERY = gql`
  query GetPartyStatus($partyId: ID!) {
    party(id: $partyId) {
      id
      unclaimedRewards
      cooldownEndsAt
      provisionsRemaining
      lastUpdatedAt
      owner
      totalPower
    }
  }
`;

interface UseRealtimePartyStatusOptions {
  partyId: string;
  // 降級到輪詢的間隔（毫秒）
  pollInterval?: number;
  // 是否啟用訂閱
  enableSubscription?: boolean;
}

export function useRealtimePartyStatus({
  partyId,
  pollInterval = 10000,
  enableSubscription = true,
}: UseRealtimePartyStatusOptions) {
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(connectionStatus.isConnected);
  
  // 監聽 WebSocket 連接狀態
  useEffect(() => {
    return connectionStatus.subscribe(setIsWebSocketConnected);
  }, []);

  // 使用查詢獲取初始數據
  const {
    data: queryData,
    loading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery(PARTY_STATUS_QUERY, {
    variables: { partyId },
    skip: !partyId,
    // 如果 WebSocket 斷開，啟用輪詢
    pollInterval: !isWebSocketConnected ? pollInterval : 0,
  });

  // 使用訂閱獲取即時更新
  const {
    data: subscriptionData,
    loading: subscriptionLoading,
    error: subscriptionError,
  } = useSubscription(PARTY_STATUS_SUBSCRIPTION, {
    variables: { partyId },
    skip: !partyId || !enableSubscription || !isWebSocketConnected,
    onError: (error) => {
      logger.error('Party subscription error:', error);
    },
    onData: ({ data }) => {
      if (data?.party) {
        logger.info('Received party update:', {
          partyId: data.party.id,
          unclaimedRewards: data.party.unclaimedRewards,
        });
      }
    },
  });

  // 優先使用訂閱數據，回退到查詢數據
  const party = subscriptionData?.party || queryData?.party;
  const loading = queryLoading && subscriptionLoading;
  const error = subscriptionError || queryError;

  return {
    party,
    loading,
    error,
    refetch,
    isRealtime: isWebSocketConnected && enableSubscription && !subscriptionError,
    connectionStatus: isWebSocketConnected ? 'connected' : 'polling',
  };
}