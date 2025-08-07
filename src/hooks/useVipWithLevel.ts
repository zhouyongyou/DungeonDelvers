// src/hooks/useVipWithLevel.ts
// 混合數據源獲取 VIP 信息：子圖 + 合約

import { useReadContract } from 'wagmi';
import { getContractWithABI } from '../config/contractsWithABI';
import type { VipNft } from '../types/nft';

interface UseVipWithLevelProps {
  address?: `0x${string}`;
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
    address: vipContract?.address as `0x${string}`,
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
 * 注意：這不是一個 Hook，因為它在循環中調用 Hook 會違反 React 規則
 * 請直接在組件中使用 useVipWithLevel
 */
export function processMultipleVipData(
  vipNfts: VipNft[], 
  contractLevel: bigint | undefined,
  isLevelLoading: boolean,
  levelError?: Error
): VipWithLevel[] {
  const results: VipWithLevel[] = [];
  
  for (const vipData of vipNfts) {
    const currentLevel = contractLevel ? Number(contractLevel) : 0;
    
    const enhancedVipData: VipWithLevel = {
      ...vipData,
      level: currentLevel,
      currentLevel,
      isLevelLoading,
      levelError,
      name: currentLevel > 0 ? `VIP${currentLevel} Card #${vipData.id}` : `VIP Card #${vipData.id}`,
      attributes: [
        { trait_type: 'Level', value: currentLevel },
        { trait_type: 'Staked Amount', value: Number(vipData.stakedAmount) },
        ...vipData.attributes.filter(attr => 
          attr.trait_type !== 'Level' && attr.trait_type !== 'Staked Amount'
        )
      ]
    };
    
    results.push(enhancedVipData);
  }
  
  return results;
}