import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { getApolloClient, graphqlQueries } from '../api/graphqlClient';
import { getQueryConfig, queryKeys } from '../config/queryConfig';
import { logger } from '../utils/logger';

export interface PlayerDataOptions {
  includeAssets?: boolean;
  includeVault?: boolean;
  includeVip?: boolean;
  includeStats?: boolean;
  enabled?: boolean;
}

export interface PlayerData {
  id: string;
  profile?: {
    level: number;
    experience: string;
    achievementPoints: number;
  };
  assets?: {
    heroes: any[];
    relics: any[];
    parties: any[];
  };
  vault?: {
    pendingRewards: string;
    claimedRewards: string;
    totalProvisionSpent: string;
  };
  vip?: {
    id: string;
    tokenId: string;
    stakedAmount: string;
    level: number;
  };
  // Computed fields
  totalAssetValue?: string;
  totalNftCount?: number;
}

export function usePlayerData(options: PlayerDataOptions = {}) {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const {
    includeAssets = true,
    includeVault = true,
    includeVip = true,
    includeStats = true,
    enabled = true,
  } = options;

  return useQuery<PlayerData>({
    queryKey: queryKeys.playerData(address!, [
      includeAssets && 'assets',
      includeVault && 'vault',
      includeVip && 'vip',
      includeStats && 'stats',
    ].filter(Boolean) as string[]),
    
    queryFn: async () => {
      if (!address) throw new Error('No wallet connected');

      const apolloClient = getApolloClient();
      const { query, variables } = graphqlQueries.getPlayerData(
        address,
        includeAssets,
        includeVault,
        includeVip
      );

      try {
        const result = await apolloClient.query({
          query: apolloClient.gql`${query}`,
          variables,
          context: {
            cacheTTL: 1000 * 60 * 5, // 5 minutes
          },
        });

        if (!result.data.player) {
          logger.warn('Player not found in subgraph:', address);
          return createEmptyPlayerData(address);
        }

        return transformPlayerData(result.data.player);
      } catch (error) {
        logger.error('Failed to fetch player data:', error);
        throw error;
      }
    },

    ...getQueryConfig('GRAPHQL'),
    enabled: enabled && !!address,
    
    // Optimistic updates
    onSuccess: (data) => {
      // Pre-populate related queries
      if (data.assets) {
        queryClient.setQueryData(
          queryKeys.ownedNfts(address!, 56), // BSC chainId
          {
            heroes: data.assets.heroes,
            relics: data.assets.relics,
            parties: data.assets.parties,
            vipCards: data.vip ? [data.vip] : [],
          }
        );
      }
    },
  });
}

// Hook for prefetching player data
export function usePrefetchPlayerData() {
  const queryClient = useQueryClient();

  return async (address: string, options: PlayerDataOptions = {}) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.playerData(address, [
        options.includeAssets && 'assets',
        options.includeVault && 'vault',
        options.includeVip && 'vip',
      ].filter(Boolean) as string[]),
      queryFn: async () => {
        const apolloClient = getApolloClient();
        const { query, variables } = graphqlQueries.getPlayerData(
          address,
          options.includeAssets ?? true,
          options.includeVault ?? true,
          options.includeVip ?? true
        );

        const result = await apolloClient.query({
          query: apolloClient.gql`${query}`,
          variables,
        });

        return transformPlayerData(result.data.player);
      },
      ...getQueryConfig('GRAPHQL'),
    });
  };
}

// Hook for batch fetching multiple players
export function usePlayersData(addresses: string[]) {
  return useQuery({
    queryKey: ['playersData', addresses],
    queryFn: async () => {
      if (addresses.length === 0) return [];

      const apolloClient = getApolloClient();
      const { query, variables } = graphqlQueries.getPlayersData(addresses);

      try {
        const result = await apolloClient.query({
          query: apolloClient.gql`${query}`,
          variables,
        });

        return result.data.players.map(transformPlayerData);
      } catch (error) {
        logger.error('Failed to fetch players data:', error);
        throw error;
      }
    },
    ...getQueryConfig('GRAPHQL'),
    enabled: addresses.length > 0,
  });
}

// Transform raw GraphQL data to consistent format
function transformPlayerData(rawData: any): PlayerData {
  const transformed: PlayerData = {
    id: rawData.id,
  };

  if (rawData.profile) {
    transformed.profile = {
      level: rawData.profile.level || 0,
      experience: rawData.profile.experience || '0',
      achievementPoints: rawData.profile.achievementPoints || 0,
    };
  }

  if (rawData.heroes || rawData.relics || rawData.parties) {
    transformed.assets = {
      heroes: rawData.heroes || [],
      relics: rawData.relics || [],
      parties: rawData.parties || [],
    };
  }

  if (rawData.vault) {
    transformed.vault = {
      pendingRewards: rawData.vault.pendingRewards || '0',
      claimedRewards: rawData.vault.claimedRewards || '0',
      totalProvisionSpent: rawData.vault.totalProvisionSpent || '0',
    };
  }

  if (rawData.vip) {
    transformed.vip = {
      id: rawData.vip.id,
      tokenId: rawData.vip.tokenId || '0',
      stakedAmount: rawData.vip.stakedAmount || '0',
      level: rawData.vip.level || 0,
    };
  }

  // Add computed fields
  if (transformed.vault && transformed.vip) {
    const pendingRewards = BigInt(transformed.vault.pendingRewards);
    const stakedAmount = BigInt(transformed.vip.stakedAmount);
    transformed.totalAssetValue = (pendingRewards + stakedAmount).toString();
  }

  if (transformed.assets) {
    transformed.totalNftCount = 
      transformed.assets.heroes.length + 
      transformed.assets.relics.length + 
      transformed.assets.parties.length;
  }

  return transformed;
}

// Create empty player data structure
function createEmptyPlayerData(address: string): PlayerData {
  return {
    id: address.toLowerCase(),
    profile: {
      level: 0,
      experience: '0',
      achievementPoints: 0,
    },
    assets: {
      heroes: [],
      relics: [],
      parties: [],
    },
    vault: {
      pendingRewards: '0',
      claimedRewards: '0',
      totalProvisionSpent: '0',
    },
    totalAssetValue: '0',
    totalNftCount: 0,
  };
}