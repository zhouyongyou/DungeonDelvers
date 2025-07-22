// apolloClient.ts - Apollo Client 配置（支援 WebSocket 訂閱）

import { ApolloClient, InMemoryCache, split, ApolloLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { createHttpLink } from '@apollo/client/link/http';
import { onError } from '@apollo/client/link/error';
import { logger } from '../utils/logger';

// 獲取 GraphQL 端點
const GRAPHQL_ENDPOINT = import.meta.env.VITE_THE_GRAPH_API_URL || 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.7';

// 將 HTTP URL 轉換為 WebSocket URL
const getWebSocketUrl = (httpUrl: string) => {
  return httpUrl.replace('https://', 'wss://').replace('http://', 'ws://');
};

// HTTP 連接（用於查詢和變更）
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
});

// WebSocket 連接（用於訂閱）
const wsLink = new GraphQLWsLink(
  createClient({
    url: getWebSocketUrl(GRAPHQL_ENDPOINT),
    connectionParams: {
      // 如果需要認證，可以在這裡添加
    },
    // 重連邏輯
    shouldRetry: () => true,
    retryAttempts: 5,
    retryWait: async (retries) => {
      // 指數退避：1s, 2s, 4s, 8s, 16s (最大 30s)
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      logger.info(`WebSocket reconnecting in ${delay}ms (attempt ${retries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    },
    on: {
      connected: () => {
        logger.info('WebSocket connected to subgraph');
      },
      closed: () => {
        logger.warn('WebSocket connection closed');
      },
      error: (error) => {
        logger.error('WebSocket error:', error);
      },
    },
  })
);

// 錯誤處理
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      logger.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    logger.error(`Network error: ${networkError}`);
    
    // 如果是訂閱錯誤，嘗試降級到輪詢
    const { query } = operation;
    const definition = getMainDefinition(query);
    if (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    ) {
      logger.warn('Subscription failed, consider falling back to polling');
    }
  }
});

// 根據操作類型分割連接
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

// 組合所有 links
const link = ApolloLink.from([errorLink, splitLink]);

// 創建 Apollo Client
export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      Party: {
        fields: {
          // 確保 unclaimedRewards 總是最新的
          unclaimedRewards: {
            merge: false,
          },
        },
      },
      PlayerProfile: {
        fields: {
          totalRewardsEarned: {
            merge: false,
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'cache-first',
    },
  },
});

// 連接狀態管理
export const connectionStatus = {
  isConnected: false,
  listeners: new Set<(connected: boolean) => void>(),
  
  setConnected(connected: boolean) {
    this.isConnected = connected;
    this.listeners.forEach(listener => listener(connected));
  },
  
  subscribe(listener: (connected: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
};

// 監聽 WebSocket 連接狀態
const wsClient = (wsLink as any).client;
wsClient.on('connected', () => connectionStatus.setConnected(true));
wsClient.on('closed', () => connectionStatus.setConnected(false));