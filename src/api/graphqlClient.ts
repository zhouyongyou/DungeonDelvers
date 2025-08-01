import { ApolloClient, InMemoryCache, ApolloLink, Observable } from '@apollo/client';
import type { NormalizedCacheObject } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { graphqlPersistentCache } from '../cache/persistentCache';
import { logger } from '../utils/logger';
import { subgraphConfig } from '../config/subgraphConfig';

// GraphQL Fragments for reuse
export const PLAYER_FRAGMENTS = {
  core: `
    fragment PlayerCore on Player {
      id
      profile {
        name
        successfulExpeditions
        totalRewardsEarned
        commissionEarned
      }
    }
  `,
  assets: `
    fragment PlayerAssets on Player {
      heros {
        id
        tokenId
        power
        rarity
        contractAddress
      }
      relics {
        id
        tokenId
        capacity
        rarity
        contractAddress
      }
      parties {
        id
        tokenId
        name
        totalPower
        heroIds
        heroes
      }
    }
  `,
  vault: `
    fragment PlayerVault on Player {
      vault {
        pendingRewards
        claimedRewards
        totalProvisionSpent
      }
    }
  `,
  vip: `
    fragment PlayerVip on Player {
      vip {
        id
        tokenId
        stakedAmount
        level
      }
    }
  `,
};

// Cache field policies
const cacheConfig = new InMemoryCache({
  typePolicies: {
    Player: {
      keyFields: ['id'],
      fields: {
        // Computed field: total asset value
        totalAssetValue: {
          read(_, { readField }) {
            const vault = readField('vault') as any;
            const vip = readField('vip') as any;
            const pendingRewards = vault?.pendingRewards || '0';
            const stakedAmount = vip?.stakedAmount || '0';
            return (BigInt(pendingRewards) + BigInt(stakedAmount)).toString();
          },
        },
        // Computed field: total NFT count
        totalNftCount: {
          read(_, { readField }) {
            const heroes = readField('heros') as any[] || [];
            const relics = readField('relics') as any[] || [];
            const parties = readField('parties') as any[] || [];
            return heroes.length + relics.length + parties.length;
          },
        },
      },
    },
    Query: {
      fields: {
        player: {
          // Merge incoming player data
          merge(existing, incoming, { mergeObjects }) {
            return mergeObjects(existing, incoming);
          },
        },
      },
    },
  },
});

// Custom caching link
const cachingLink = new ApolloLink((operation, forward) => {
  return new Observable(observer => {
    const context = operation.getContext();
    const { skipCache = false, cacheTTL = 300000 } = context; // 5 minutes default

    if (!skipCache) {
      const cacheKey = `${operation.operationName}:${JSON.stringify(operation.variables)}`;
      
      // Try to get from cache
      graphqlPersistentCache.get(cacheKey).then(cachedData => {
        if (cachedData) {
          observer.next(cachedData);
          observer.complete();
          return;
        }

        // If not in cache, proceed with request
        const subscription = forward(operation).subscribe({
          next: data => {
            // Cache the result
            graphqlPersistentCache.set(cacheKey, data, cacheTTL);
            observer.next(data);
          },
          error: observer.error.bind(observer),
          complete: observer.complete.bind(observer),
        });

        return () => subscription.unsubscribe();
      });
    } else {
      return forward(operation).subscribe(observer);
    }
  });
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      logger.error('GraphQL error:', {
        message,
        locations,
        path,
        operation: operation.operationName,
      });
    });
  }

  if (networkError) {
    logger.error('Network error:', {
      error: networkError,
      operation: operation.operationName,
    });

    // Retry logic for network errors
    if ((networkError as any).statusCode === 500) {
      return forward(operation);
    }
  }
});

// Performance monitoring link
const performanceLink = new ApolloLink((operation, forward) => {
  const startTime = Date.now();

  return forward(operation).map(data => {
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      logger.warn('Slow GraphQL query:', {
        operation: operation.operationName,
        duration: `${duration}ms`,
        variables: operation.variables,
      });
    }

    return data;
  });
});

// 智能端點選擇 Link
const smartEndpointLink = new ApolloLink((operation, forward) => {
  return new Observable(observer => {
    // 每次查詢都動態選擇最佳端點
    subgraphConfig.getOptimalEndpoint().then(optimalUri => {
      const start = Date.now();
      
      // 設定動態 URI
      operation.setContext({ uri: optimalUri });
      
      // 執行查詢
      const subscription = forward(operation).subscribe({
        next: (result) => {
          const duration = Date.now() - start;
          const endpointType = optimalUri.includes('studio') ? 'studio' : 'decentralized';
          
          logger.debug(`GraphQL query via ${endpointType}: ${duration}ms`, {
            operation: operation.operationName,
            endpoint: endpointType,
            uri: optimalUri
          });
          
          observer.next(result);
        },
        error: (error) => {
          const endpointType = optimalUri.includes('studio') ? 'studio' : 'decentralized';
          logger.warn(`GraphQL query failed via ${endpointType}:`, {
            operation: operation.operationName,
            endpoint: endpointType,
            error: error.message
          });
          observer.error(error);
        },
        complete: () => observer.complete()
      });
      
      return () => subscription.unsubscribe();
    }).catch(error => {
      logger.error('Failed to get optimal endpoint:', error);
      observer.error(error);
    });
  });
});

// Create Apollo Client
export const createApolloClient = (): ApolloClient<NormalizedCacheObject> => {
  return new ApolloClient({
    cache: cacheConfig,
    link: ApolloLink.from([
      errorLink,
      performanceLink,
      smartEndpointLink, // 使用智能端點選擇
      cachingLink,
      new ApolloLink((operation, forward) => {
        // Add auth headers if needed
        operation.setContext({
          headers: {
            'content-type': 'application/json',
          },
        });
        return forward(operation);
      }),
    ]),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
    },
  });
};

// Singleton instance
let apolloClient: ApolloClient<NormalizedCacheObject> | null = null;

export const getApolloClient = (): ApolloClient<NormalizedCacheObject> => {
  if (!apolloClient) {
    apolloClient = createApolloClient();
  }
  return apolloClient;
};

// Utility functions for common queries
export const graphqlQueries = {
  // Get player data with specific fields
  getPlayerData: (address: string, includeAssets = true, includeVault = true, includeVip = true) => ({
    query: `
      ${PLAYER_FRAGMENTS.core}
      ${includeAssets ? PLAYER_FRAGMENTS.assets : ''}
      ${includeVault ? PLAYER_FRAGMENTS.vault : ''}
      ${includeVip ? PLAYER_FRAGMENTS.vip : ''}
      
      query GetPlayerData($address: ID!) {
        player(id: $address) {
          ...PlayerCore
          ${includeAssets ? '...PlayerAssets' : ''}
          ${includeVault ? '...PlayerVault' : ''}
          ${includeVip ? '...PlayerVip' : ''}
        }
      }
    `,
    variables: { address: address.toLowerCase() },
  }),

  // Batch query for multiple players
  getPlayersData: (addresses: string[]) => ({
    query: `
      ${PLAYER_FRAGMENTS.core}
      
      query GetPlayersData($addresses: [ID!]!) {
        players(where: { id_in: $addresses }) {
          ...PlayerCore
        }
      }
    `,
    variables: { addresses: addresses.map(a => a.toLowerCase()) },
  }),
};