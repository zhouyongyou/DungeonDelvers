// src/hooks/useVipStatus.ts (★ DEBUG 功能版)

import { useAccount, useReadContract, useBalance } from 'wagmi';
import { useMemo } from 'react';
import { bsc } from 'wagmi/chains';
import { getContract } from '../config/contracts';
import { useCountdown } from './useCountdown';

/**
 * @notice 專門用於獲取和管理 VIP 頁面所有狀態的自定義 Hook。
 * @dev 封裝了所有與 VIP 合約的互動、數據讀取和狀態計算，使 VipPage 元件更簡潔。
 */
export const useVipStatus = () => {
    const { address, chainId } = useAccount();

    const isSupportedChain = chainId === bsc.id;

    // 依賴鏈 ID 獲取合約實例
    const vipStakingContract = useMemo(() => isSupportedChain ? getContract(chainId, 'vipStaking') : null, [chainId, isSupportedChain]);
    const soulShardContract = useMemo(() => isSupportedChain ? getContract(chainId, 'soulShard') : null, [chainId, isSupportedChain]);
    const oracleContract = useMemo(() => isSupportedChain ? getContract(chainId, 'oracle') : null, [chainId, isSupportedChain]);

    // 讀取鏈上數據
    const { data: soulShardBalance, isLoading: isLoadingBalance, refetch: refetchBalance } = useBalance({ address, token: soulShardContract?.address, query: { enabled: !!address && !!soulShardContract } });
    
    const { data: stakeInfo, isLoading: isLoadingStakeInfo, refetch: refetchStakeInfo } = useReadContract({
        ...vipStakingContract,
        functionName: 'userStakes',
        args: [address!],
        query: { enabled: !!address && !!vipStakingContract }
    });

    const { data: vipLevel, isLoading: isLoadingVipLevel, refetch: refetchVipLevel } = useReadContract({ ...vipStakingContract, functionName: 'getVipLevel', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    const { data: taxReduction, isLoading: isLoadingTax, refetch: refetchTaxReduction } = useReadContract({ ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    
    const { data: unstakeQueue, isLoading: isLoadingQueue, refetch: refetchUnstakeQueue } = useReadContract({
        ...vipStakingContract,
        functionName: 'unstakeQueue',
        args: [address!],
        query: { enabled: !!address && !!vipStakingContract }
    });

    const { data: allowance, isLoading: isLoadingAllowance, refetch: refetchAllowance } = useReadContract({ ...soulShardContract, functionName: 'allowance', args: [address!, vipStakingContract?.address!], query: { enabled: !!address && !!vipStakingContract && !!soulShardContract } });

    // 計算衍生狀態
    const stakedAmount = useMemo(() => (stakeInfo as readonly [bigint, bigint])?.[0] ?? 0n, [stakeInfo]);
    const tokenId = useMemo(() => (stakeInfo as readonly [bigint, bigint])?.[1], [stakeInfo]);

    // ★★★【DEBUG 新增】★★★
    // 新增一個 useReadContract 呼叫，用於獲取質押金額對應的 USD 價值
    const { data: stakedValueUSD, isLoading: isLoadingStakedValueUSD, refetch: refetchStakedValueUSD } = useReadContract({
        ...oracleContract,
        functionName: 'getAmountOut',
        args: [soulShardContract?.address!, stakedAmount],
        query: { enabled: !!oracleContract && !!soulShardContract && stakedAmount > 0n }
    });

    const pendingUnstakeAmount = useMemo(() => (unstakeQueue as readonly [bigint, bigint])?.[0] ?? 0n, [unstakeQueue]);
    const unstakeAvailableAt = useMemo(() => Number((unstakeQueue as readonly [bigint, bigint])?.[1] ?? 0n), [unstakeQueue]);

    const { isOver: isCooldownOver, formatted: countdown } = useCountdown(unstakeAvailableAt);

    // 統一的刷新函式
    const refetchAll = () => {
        refetchStakeInfo();
        refetchBalance();
        refetchVipLevel();
        refetchTaxReduction();
        refetchUnstakeQueue();
        refetchAllowance();
        refetchStakedValueUSD(); // ★★★【DEBUG 新增】★★★
    };

    return {
        isLoading: isLoadingStakeInfo || isLoadingBalance || isLoadingVipLevel || isLoadingTax || isLoadingQueue || isLoadingAllowance || isLoadingStakedValueUSD,
        vipStakingContract,
        soulShardContract,
        soulShardBalance: soulShardBalance?.value ?? 0n,
        stakedAmount,
        stakedValueUSD: (stakedValueUSD as bigint) ?? 0n, // ★★★【DEBUG 新增】★★★
        tokenId,
        vipLevel: vipLevel ?? 0,
        taxReduction: taxReduction ?? 0n,
        pendingUnstakeAmount,
        isCooldownOver,
        countdown,
        allowance: allowance ?? 0n,
        refetchAll,
    };
};
