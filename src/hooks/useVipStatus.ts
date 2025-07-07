// src/hooks/useVipStatus.ts (★ 全新檔案)

import { useAccount, useReadContract, useBalance } from 'wagmi';
import { useMemo } from 'react';
import { bsc } from 'wagmi/chains';
import { getContract } from '../config/contracts';
import { useCountdown } from './useCountdown';

/**
 * @notice 專門用於獲取和管理 VIP 頁面所有狀態的自定義 Hook。
 * @dev 封裝了所有與 VIP 合約的互動、數據讀取和狀態計算，使 VipPage 元件更簡潔。
 * @returns 包含 VIP 相關所有數據和狀態的物件。
 */
export const useVipStatus = () => {
    const { address, chainId } = useAccount();

    const isSupportedChain = chainId === bsc.id;

    // 依賴鏈 ID 獲取合約實例
    const vipStakingContract = useMemo(() => isSupportedChain ? getContract(chainId, 'vipStaking') : null, [chainId, isSupportedChain]);
    const soulShardContract = useMemo(() => isSupportedChain ? getContract(chainId, 'soulShard') : null, [chainId, isSupportedChain]);

    // 讀取鏈上數據
    const { data: soulShardBalance, isLoading: isLoadingBalance } = useBalance({ address, token: soulShardContract?.address, query: { enabled: !!address && !!soulShardContract } });
    
    // 明確指定回傳型別，避免 TypeScript 推斷錯誤
    const { data: stakeInfo, isLoading: isLoadingStakeInfo } = useReadContract({
        ...vipStakingContract,
        functionName: 'userStakes',
        args: [address!],
        query: { enabled: !!address && !!vipStakingContract }
    }) as { data: readonly [bigint, bigint] | undefined, isLoading: boolean };

    const { data: vipLevel, isLoading: isLoadingVipLevel } = useReadContract({ ...vipStakingContract, functionName: 'getVipLevel', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    const { data: taxReduction, isLoading: isLoadingTax } = useReadContract({ ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    
    const { data: unstakeQueue, isLoading: isLoadingQueue } = useReadContract({
        ...vipStakingContract,
        functionName: 'unstakeQueue',
        args: [address!],
        query: { enabled: !!address && !!vipStakingContract }
    }) as { data: readonly [bigint, bigint] | undefined, isLoading: boolean };

    const { data: allowance, isLoading: isLoadingAllowance, refetch: refetchAllowance } = useReadContract({ ...soulShardContract, functionName: 'allowance', args: [address!, vipStakingContract?.address!], query: { enabled: !!address && !!vipStakingContract && !!soulShardContract } });

    // 計算衍生狀態
    const stakedAmount = useMemo(() => stakeInfo?.[0] ?? 0n, [stakeInfo]);
    const tokenId = useMemo(() => stakeInfo?.[1], [stakeInfo]);
    const pendingUnstakeAmount = useMemo(() => unstakeQueue?.[0] ?? 0n, [unstakeQueue]);
    const unstakeAvailableAt = useMemo(() => Number(unstakeQueue?.[1] ?? 0n), [unstakeQueue]);

    const { isOver: isCooldownOver, formatted: countdown } = useCountdown(unstakeAvailableAt);

    return {
        isLoading: isLoadingBalance || isLoadingStakeInfo || isLoadingVipLevel || isLoadingTax || isLoadingQueue || isLoadingAllowance,
        vipStakingContract,
        soulShardContract,
        soulShardBalance: soulShardBalance?.value ?? 0n,
        stakedAmount,
        tokenId,
        vipLevel: vipLevel ?? 0,
        taxReduction: taxReduction ?? 0n,
        pendingUnstakeAmount,
        isCooldownOver,
        countdown,
        allowance: allowance ?? 0n,
        refetchAllowance,
    };
};
