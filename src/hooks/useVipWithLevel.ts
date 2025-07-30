// src/hooks/useVipWithLevel.ts
// 混合數據源獲取 VIP 信息：子圖 + 合約

import { useReadContract } from 'wagmi';
import type { Address } from 'viem';
import { getContractWithABI } from '../config/contractsWithABI';
import type { VipNft } from '../types/nft';

interface UseVipWithLevelProps {
  address?: Address;
  vipData?: VipNft; // 來自子圖的基本 VIP 數據
  chainId?: number;
}

interface VipWithLevel extends VipNft {
  currentLevel: number;
  isLevelLoading: boolean;
  levelError?: Error;
}

/**
 * 混合數據源的 VIP hook
 * - 子圖：質押記錄、歷史數據
 * - 合約：實時 VIP 等級
 */
export function useVipWithLevel({ 
  address, 
  vipData, 
  chainId 
}: UseVipWithLevelProps): VipWithLevel | null {
  const vipContract = getContractWithABI('VIPSTAKING');
  
  // 從合約讀取實時 VIP 等級
  const { 
    data: contractLevel, 
    isLoading: isLevelLoading, 
    error: levelError 
  } = useReadContract({
    address: vipContract?.address as Address,
    abi: vipContract?.abi,
    functionName: 'getVipLevel',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!vipContract,
      staleTime: 30 * 1000, // 30秒緩存
      gcTime: 5 * 60 * 1000, // 5分鐘垃圾回收
    }
  });

  if (!vipData) {
    return null;
  }

  const currentLevel = contractLevel ? Number(contractLevel) : 0;
  
  // 整合子圖數據和合約等級
  const enhancedVipData: VipWithLevel = {
    ...vipData,
    level: currentLevel,
    currentLevel,
    isLevelLoading,
    levelError: levelError as Error | undefined,
    // 根據實時等級更新名稱
    name: currentLevel > 0 ? `VIP${currentLevel} Card #${vipData.id}` : `VIP Card #${vipData.id}`,
    // 更新屬性
    attributes: [
      { trait_type: 'Level', value: currentLevel },
      { trait_type: 'Staked Amount', value: Number(vipData.stakedAmount) },
      ...vipData.attributes.filter(attr => 
        attr.trait_type !== 'Level' && attr.trait_type !== 'Staked Amount'
      )
    ]
  };

  return enhancedVipData;
}

/**
 * 批量處理多個 VIP NFT 的等級
 */
export function useMultipleVipWithLevel(
  vipNfts: VipNft[], 
  ownerAddress?: Address
): VipWithLevel[] {
  // 對於多個 VIP（理論上每個用戶只有一個），可以考慮批量調用
  // 但目前簡化為單個處理
  const results: VipWithLevel[] = [];
  
  for (const vipData of vipNfts) {
    const enhancedVip = useVipWithLevel({
      address: ownerAddress,
      vipData,
    });
    
    if (enhancedVip) {
      results.push(enhancedVip);
    }
  }
  
  return results;
}