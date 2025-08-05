// useOptimizedPlayerData.ts - 優化的玩家數據 Hook
// 整合批量讀取和請求去重，專門為總覽頁面優化

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { usePlayerDataBatch } from './useBatchContractRead';
import { useDedupedSubgraphQuery } from './useRequestDeduper';
import { formatEther } from 'viem';
import { logger } from '../utils/logger';

export interface OptimizedPlayerData {
  // 合約數據
  vaultBalance: bigint;
  referrer: `0x${string}` | null;
  vipStakeAmount: bigint;
  
  // 子圖數據
  totalHeroes: number;
  totalRelics: number;
  totalParties: number;
  totalExperience: bigint;
  
  // 計算屬性
  isVip: boolean;
  formattedBalance: string;
  formattedStake: string;
  
  // 載入狀態
  isLoading: boolean;
  isError: boolean;
  error?: Error;
}

const PLAYER_SUBGRAPH_QUERY = `
  query GetPlayerData($address: Bytes!) {
    player(id: $address) {
      id
      totalExperience
      profileCreated
    }
    heros(where: { owner: $address }) {
      id
      tokenId
      class
      level
    }
    relics(where: { owner: $address }) {
      id
      tokenId
      rarity
      relicType
    }
    parties(where: { owner: $address }) {
      id
      tokenId
      heroIds
      relicIds
    }
  }
`;

/**
 * 優化的玩家數據 Hook
 * 使用批量讀取和請求去重技術
 */
export function useOptimizedPlayerData(): OptimizedPlayerData {
  const { address } = useAccount();

  // 批量讀取合約數據
  const {
    data: contractData,
    isLoading: contractLoading,
    isError: contractError,
    error: contractErrorObj
  } = usePlayerDataBatch(address);

  // 去重子圖查詢
  const {
    data: subgraphData,
    isLoading: subgraphLoading, 
    isError: subgraphError,
    error: subgraphErrorObj
  } = useDedupedSubgraphQuery(
    PLAYER_SUBGRAPH_QUERY,
    { address: address?.toLowerCase() },
    {
      enabled: !!address,
      staleTime: 1000 * 60 * 2, // 2分鐘緩存
      dedupWindow: 2000 // 2秒去重窗口
    }
  );

  // 計算衍生數據
  const processedData = useMemo((): OptimizedPlayerData => {
    const isLoading = contractLoading || subgraphLoading;
    const isError = contractError || subgraphError;
    const error = contractErrorObj || subgraphErrorObj;

    // 預設值
    const defaultData: OptimizedPlayerData = {
      vaultBalance: 0n,
      referrer: null,
      vipStakeAmount: 0n,
      totalHeroes: 0,
      totalRelics: 0,
      totalParties: 0, 
      totalExperience: 0n,
      isVip: false,
      formattedBalance: '0.0000',
      formattedStake: '0.0000',
      isLoading,
      isError,
      error
    };

    if (isLoading || isError || !contractData || !subgraphData) {
      return defaultData;
    }

    try {
      // 處理合約數據
      const vaultBalance = contractData.playerVaultBalance?.success 
        ? contractData.playerVaultBalance.result 
        : 0n;
        
      const referrer = contractData.referrer?.success 
        ? contractData.referrer.result 
        : null;
        
      const vipStakeAmount = contractData.vipStakeAmount?.success 
        ? contractData.vipStakeAmount.result 
        : 0n;

      // 處理子圖數據
      const heroes = subgraphData?.heros || [];
      const relics = subgraphData?.relics || [];
      const parties = subgraphData?.parties || [];
      const playerData = subgraphData?.player;

      // 計算衍生數據
      const isVip = vipStakeAmount > 0n;
      const formattedBalance = Number(formatEther(vaultBalance)).toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
      const formattedStake = Number(formatEther(vipStakeAmount)).toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });

      return {
        vaultBalance,
        referrer,
        vipStakeAmount,
        totalHeroes: heroes.length,
        totalRelics: relics.length,
        totalParties: parties.length,
        totalExperience: BigInt(playerData?.totalExperience || '0'),
        isVip,
        formattedBalance,
        formattedStake,
        isLoading: false,
        isError: false
      };

    } catch (error) {
      logger.error('Error processing player data:', error);
      return {
        ...defaultData,
        isError: true,
        error: error as Error
      };
    }
  }, [contractData, subgraphData, contractLoading, subgraphLoading, contractError, subgraphError, contractErrorObj, subgraphErrorObj]);

  return processedData;
}

/**
 * 輕量級玩家狀態 Hook
 * 只獲取最關鍵的數據，用於導航欄等輕量組件
 */
export function useLightPlayerData() {
  const { address } = useAccount();
  
  const contractData = usePlayerDataBatch(address);
  
  return useMemo(() => {
    if (!contractData.data || contractData.isLoading) {
      return {
        isVip: false,
        hasBalance: false,
        isLoading: contractData.isLoading
      };
    }

    const vipStakeAmount = contractData.data.vipStakeAmount?.success 
      ? contractData.data.vipStakeAmount.result 
      : 0n;
      
    const vaultBalance = contractData.data.playerVaultBalance?.success 
      ? contractData.data.playerVaultBalance.result 
      : 0n;

    return {
      isVip: vipStakeAmount > 0n,
      hasBalance: vaultBalance > 0n,
      isLoading: false
    };
  }, [contractData]);
}

/**
 * 批量 NFT 數據 Hook
 * 專門為資產頁面優化
 */
export function useOptimizedNftData(
  contractType: 'hero' | 'relic' | 'party',
  limit: number = 50
) {
  const { address } = useAccount();

  const query = useMemo(() => {
    switch (contractType) {
      case 'hero':
        return `
          query GetUserHeroes($address: Bytes!, $first: Int!) {
            heros(where: { owner: $address }, first: $first, orderBy: tokenId, orderDirection: desc) {
              id
              tokenId
              class
              level
              experience
              owner
            }
          }
        `;
      case 'relic':
        return `
          query GetUserRelics($address: Bytes!, $first: Int!) {
            relics(where: { owner: $address }, first: $first, orderBy: tokenId, orderDirection: desc) {
              id
              tokenId
              rarity
              relicType
              owner
            }
          }
        `;
      case 'party':
        return `
          query GetUserParties($address: Bytes!, $first: Int!) {
            parties(where: { owner: $address }, first: $first, orderBy: tokenId, orderDirection: desc) {
              id
              tokenId
              heroIds
              relicIds
              owner
            }
          }
        `;
      default:
        return '';
    }
  }, [contractType]);

  return useDedupedSubgraphQuery(
    query,
    { 
      address: address?.toLowerCase(),
      first: limit
    },
    {
      enabled: !!address && !!query,
      staleTime: 1000 * 60 * 5, // NFT 數據相對穩定，5分鐘緩存
      dedupWindow: 3000 // 3秒去重窗口
    }
  );
}