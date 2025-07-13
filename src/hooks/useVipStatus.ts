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
    
    // ★ 核心修正 #1: 使用合約方法獲取 VIP 等級和稅率減免（增強錯誤處理）
    const { data: vipData, isLoading: isLoadingVipData, error: vipDataError, refetch: refetchVipData } = useReadContracts({
        contracts: [
            { ...vipStakingContract, functionName: 'userStakes', args: [address!] },
            { ...vipStakingContract, functionName: 'unstakeQueue', args: [address!] },
            { ...soulShardContract, functionName: 'allowance', args: [address!, vipStakingContract?.address as `0x${string}`] },
            { ...vipStakingContract, functionName: 'getVipLevel', args: [address!] },
            { ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address!] },
        ],
        query: { 
            enabled: !!address && !!vipStakingContract && !!soulShardContract && !!vipStakingContract?.address && isSupportedChain,
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
            throwOnError: false, // 防止錯誤導致頁面崩潰
        }
    });

    const [
        stakeInfo,
        unstakeQueue,
        allowance,
        contractVipLevel,
        contractTaxReduction
    ] = useMemo(() => vipData?.map(d => d.result) ?? [], [vipData]);

    const stakedAmount = useMemo(() => (stakeInfo as readonly [bigint, bigint])?.[0] ?? 0n, [stakeInfo]);
    const tokenId = useMemo(() => (stakeInfo as readonly [bigint, bigint])?.[1], [stakeInfo]);
    
    // ★ 核心修正 #2: 使用合約方法獲取VIP等級和稅率減免
    const { vipLevel, taxReduction } = useMemo(() => {
        // 優先使用合約返回的數據
        if (contractVipLevel !== undefined && contractTaxReduction !== undefined) {
            const level = Number(contractVipLevel);
            const reduction = BigInt(contractTaxReduction);
            
            console.log('🔍 VIP合約數據 - 等級:', level, '稅率減免:', `${Number(reduction) / 10000}%`);
            return { vipLevel: level, taxReduction: reduction };
        }
        
        // 如果合約數據不可用，fallback 到前端計算
        if (!stakedAmount || stakedAmount === 0n) {
            return { vipLevel: 0, taxReduction: 0n };
        }
        
        const amountInEther = Number(stakedAmount) / 1e18;
        console.log('🔍 VIP Fallback計算 - 質押金額:', amountInEther.toLocaleString(), 'Soul Shard');
        
        let level = 0;
        let reduction = 0;
        
        if (amountInEther >= 10000000) {
            level = 5; reduction = 250; // 250 BP = 2.5%
        } else if (amountInEther >= 5000000) {
            level = 4; reduction = 200; // 200 BP = 2.0%
        } else if (amountInEther >= 1000000) {
            level = 3; reduction = 150; // 150 BP = 1.5%
        } else if (amountInEther >= 100000) {
            level = 2; reduction = 100; // 100 BP = 1.0%
        } else if (amountInEther >= 10000) {
            level = 1; reduction = 50; // 50 BP = 0.5%
        }
        
        console.log('🔍 VIP Fallback結果 - 等級:', level, '稅率減免:', `${reduction / 100}%`, '(', reduction, 'BP)');
        return { vipLevel: level, taxReduction: BigInt(reduction) };
    }, [contractVipLevel, contractTaxReduction, stakedAmount]);

    // 調試信息：顯示詳細的 VIP 計算過程
    useEffect(() => {
        if (address && stakedAmount > 0n) {
            console.log('🔍 VIP 調試信息:', {
                address,
                stakedAmount: stakedAmount.toString(),
                contractVipLevel: contractVipLevel?.toString(),
                contractTaxReduction: contractTaxReduction?.toString(),
                finalVipLevel: vipLevel,
                finalTaxReduction: taxReduction.toString(),
                isUsingContract: contractVipLevel !== undefined,
                stakedValueUSD: stakedValueUSD?.toString()
            });
        }
    }, [address, stakedAmount, contractVipLevel, contractTaxReduction, vipLevel, taxReduction, stakedValueUSD]);

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

    // ★ 核心修正 #3: 添加錯誤處理和調試信息
    useEffect(() => {
        if (vipDataError) {
            console.error('🚨 VIP數據讀取錯誤:', vipDataError);
        }
        if (vipData) {
            console.log('📊 VIP數據更新:', {
                address,
                stakedAmount: stakedAmount.toString(),
                contractVipLevel: contractVipLevel?.toString(),
                contractTaxReduction: contractTaxReduction?.toString(),
                finalVipLevel: vipLevel,
                finalTaxReduction: taxReduction.toString(),
                contractAddress: vipStakingContract?.address,
                dataSource: contractVipLevel !== undefined ? 'contract' : 'fallback'
            });
        }
    }, [vipData, vipDataError, address, stakedAmount, vipLevel, taxReduction, vipStakingContract?.address]);

    const refetchAll = async () => {
        try {
            console.log('🔄 刷新VIP狀態...');
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
            console.log('✅ VIP狀態刷新完成');
        } catch (error) {
            console.error('❌ 刷新VIP狀態時發生錯誤:', error);
        }
    };

    return {
        isLoading: isLoadingVipData || isLoadingBalance || (stakedAmount > 0n && isLoadingStakedValueUSD),
        error: vipDataError,
        vipStakingContract,
        soulShardContract,
        soulShardBalance: soulShardBalance?.value ?? 0n,
        stakedAmount,
        stakedValueUSD: (stakedValueUSD as bigint) ?? 0n,
        tokenId,
        vipLevel,
        taxReduction,
        pendingUnstakeAmount,
        isCooldownOver,
        countdown,
        allowance: allowance ?? 0n,
        refetchAll,
    };
};
