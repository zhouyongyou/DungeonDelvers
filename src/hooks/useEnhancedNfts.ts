// src/hooks/useEnhancedNfts.ts
// 增強版 NFT 數據獲取，整合子圖和合約數據

import { useMemo } from 'react';
import { Address } from 'viem';
import { useReadContract } from 'wagmi';
import { fetchAllOwnedNfts } from '../api/nfts';
import { useVipWithLevel } from './useVipWithLevel';
import { useQuery } from '@tanstack/react-query';
import { getQueryConfig } from '../config/queryConfig';
import { getContractWithABI } from '../config/contractsWithABI';
import type { AllNftCollections, VipNft } from '../types/nft';

interface UseEnhancedNftsProps {
  owner?: Address;
  chainId?: number;
}

interface EnhancedNftCollections extends Omit<AllNftCollections, 'vipCards'> {
  vipCards: Array<VipNft & { currentLevel: number; isLevelLoading: boolean }>;
}

/**
 * 增強版 NFT 數據獲取
 * - 子圖：基本 NFT 數據
 * - 合約：VIP 實時等級
 */
export function useEnhancedNfts({ owner, chainId }: UseEnhancedNftsProps) {
  // 獲取基本 NFT 數據（包含不含等級的 VIP 數據）
  const { 
    data: baseNftData, 
    isLoading: isBaseLoading, 
    error: baseError,
    refetch: refetchBase
  } = useQuery({
    queryKey: ['enhanced-nfts', owner, chainId],
    queryFn: () => fetchAllOwnedNfts(owner!, chainId!),
    enabled: !!owner && !!chainId,
    ...getQueryConfig('NFT')
  });

  // 獲取增強的 VIP 數據（包含合約等級）
  const enhancedVipCard = useVipWithLevel({
    address: owner,
    vipData: baseNftData?.vipCards[0], // 假設每個用戶只有一個 VIP
    chainId
  });

  // 整合所有數據
  const enhancedData: EnhancedNftCollections | undefined = useMemo(() => {
    if (!baseNftData) return undefined;

    // 調試信息
    console.log('🔍 Enhanced NFTs Debug:', {
      baseVipCards: baseNftData.vipCards.length,
      enhancedVipCard: enhancedVipCard ? 'exists' : 'null',
      vipName: enhancedVipCard?.name,
      vipLevel: enhancedVipCard?.currentLevel
    });

    return {
      heros: baseNftData.heros,
      relics: baseNftData.relics,
      parties: baseNftData.parties,
      vipCards: enhancedVipCard ? [enhancedVipCard] : []
    };
  }, [baseNftData, enhancedVipCard]);

  return {
    data: enhancedData,
    isLoading: isBaseLoading || (enhancedVipCard?.isLevelLoading ?? false),
    error: baseError,
    refetch: refetchBase,
    // 額外的狀態
    isVipLevelLoading: enhancedVipCard?.isLevelLoading ?? false,
    vipLevelError: enhancedVipCard?.levelError,
  };
}

/**
 * 簡化版本：只獲取 VIP 等級（用於其他組件）
 */
export function useVipLevel(address?: Address) {
  const vipContract = useReadContract({
    address: getContractWithABI('VIPSTAKING')?.address as Address,
    abi: getContractWithABI('VIPSTAKING')?.abi,
    functionName: 'getVipLevel',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
    }
  });

  return {
    vipLevel: vipContract.data ? Number(vipContract.data) : 0,
    isLoading: vipContract.isLoading,
    error: vipContract.error
  };
}