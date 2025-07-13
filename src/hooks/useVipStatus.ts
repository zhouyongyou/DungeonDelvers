// src/hooks/useVipStatus.ts (修正後)

import { useAccount, useReadContract, useBalance, useReadContracts } from 'wagmi';
import { useMemo, useEffect } from 'react';
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

    const vipStakingContract = useMemo(() => {
        if (!isSupportedChain) return null;
        const contract = getContract(chainId, 'vipStaking');
        console.log('🔍 VIP合約地址:', contract?.address);
        return contract;
    }, [chainId, isSupportedChain]);
    
    const soulShardContract = useMemo(() => isSupportedChain ? getContract(chainId, 'soulShard') : null, [chainId, isSupportedChain]);
    const oracleContract = useMemo(() => isSupportedChain ? getContract(chainId, 'oracle') : null, [chainId, isSupportedChain]);

    // 讀取鏈上數據
    const { data: soulShardBalance, isLoading: isLoadingBalance, refetch: refetchBalance } = useBalance({ address, token: soulShardContract?.address, query: { enabled: !!address && !!soulShardContract } });
    
    // ★ 核心修正 #1: 使用 useReadContracts 一次性獲取多個數據，減少 RPC 呼叫
    const { data: vipData, isLoading: isLoadingVipData, error: vipDataError, refetch: refetchVipData } = useReadContracts({
        contracts: [
            { ...vipStakingContract, functionName: 'userStakes', args: [address!] },
            { ...vipStakingContract, functionName: 'getVipLevel', args: [address!] },
            { ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address!] },
            { ...vipStakingContract, functionName: 'unstakeQueue', args: [address!] },
            { ...soulShardContract, functionName: 'allowance', args: [address!, vipStakingContract?.address as `0x${string}`] },
        ],
        query: { 
            enabled: !!address && !!vipStakingContract && !!soulShardContract && !!vipStakingContract?.address,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        }
    });

    const [
        stakeInfo,
        vipLevel,
        taxReduction,
        unstakeQueue,
        allowance
    ] = useMemo(() => vipData?.map(d => d.result) ?? [], [vipData]);

    const stakedAmount = useMemo(() => (stakeInfo as readonly [bigint, bigint])?.[0] ?? 0n, [stakeInfo]);
    const tokenId = useMemo(() => (stakeInfo as readonly [bigint, bigint])?.[1], [stakeInfo]);

    // ★ 核心修正 #2: 確保即使 stakedAmount 為 0，也能安全地觸發後續查詢
    const { data: stakedValueUSD, isLoading: isLoadingStakedValueUSD, refetch: refetchStakedValueUSD } = useReadContract({
        ...oracleContract,
        functionName: 'getAmountOut',
        args: [soulShardContract?.address as `0x${string}`, stakedAmount],
        query: { 
            enabled: !!oracleContract && !!soulShardContract && (stakedAmount > 0n)
        }
    });

    const pendingUnstakeAmount = useMemo(() => (unstakeQueue as readonly [bigint, bigint])?.[0] ?? 0n, [unstakeQueue]);
    const unstakeAvailableAt = useMemo(() => Number((unstakeQueue as readonly [bigint, bigint])?.[1] ?? 0n), [unstakeQueue]);

    const { isOver: isCooldownOver, formatted: countdown } = useCountdown(unstakeAvailableAt);

    const refetchAll = async () => {
        try {
            // 並行執行所有refetch操作
            const promises = [
                refetchVipData(),
                refetchBalance(),
            ];
            
            await Promise.all(promises);
            
            // 單獨處理 stakedValueUSD 的 refetch，因為它有不同的返回類型
            if (stakedAmount > 0n) {
                await refetchStakedValueUSD();
            }
        } catch (error) {
            console.error('刷新VIP狀態時發生錯誤:', error);
        }
    };

    return {
        isLoading: isLoadingVipData || isLoadingBalance || (stakedAmount > 0n && isLoadingStakedValueUSD),
        vipStakingContract,
        soulShardContract,
        soulShardBalance: soulShardBalance?.value ?? 0n,
        stakedAmount,
        stakedValueUSD: (stakedValueUSD as bigint) ?? 0n,
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
