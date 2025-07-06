// src/hooks/useVipStatus.ts

import { useAccount, useReadContract, useBalance } from 'wagmi';
import { useMemo, useState, useEffect } from 'react';
import { bsc, bscTestnet } from 'wagmi/chains';
import { getContract } from '../config/contracts';
import { formatEther } from 'viem';

/**
 * @notice 一個自定義的倒數計時 Hook。
 * @param targetTimestamp 目標時間戳 (秒)。
 * @returns 一個包含倒數計時狀態和格式化字串的物件。
 */
const useCountdown = (targetTimestamp: number) => {
    const [now, setNow] = useState(Date.now() / 1000);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now() / 1000), 1000);
        return () => clearInterval(interval);
    }, []);

    const secondsRemaining = Math.max(0, targetTimestamp - now);
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = Math.floor(secondsRemaining % 60);

    return {
        isOver: secondsRemaining === 0,
        formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    };
};

/**
 * @notice 專門用於獲取和管理 VIP 頁面所有狀態的自定義 Hook。
 * @dev 封裝了所有與 VIP 合約的互動、數據讀取和狀態計算。
 * @returns 包含 VIP 相關所有數據和狀態的物件。
 */
export const useVipStatus = () => {
    const { address, chainId } = useAccount();

    // 進行網路檢查，確保在支援的鏈上
    const isSupportedChain = chainId === bsc.id || chainId === bscTestnet.id;

    // 根據 chainId 獲取合約實例
    const vipStakingContract = useMemo(() => isSupportedChain ? getContract(chainId, 'vipStaking') : null, [chainId, isSupportedChain]);
    const soulShardContract = useMemo(() => isSupportedChain ? getContract(chainId, 'soulShard') : null, [chainId, isSupportedChain]);

    // 讀取鏈上數據
    const { data: soulShardBalance, isLoading: isLoadingBalance } = useBalance({ address, token: soulShardContract?.address, query: { enabled: !!address && !!soulShardContract } });
    const { data: stakeInfo, isLoading: isLoadingStakeInfo } = useReadContract({ ...vipStakingContract, functionName: 'userStakes', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    const { data: vipLevel, isLoading: isLoadingVipLevel } = useReadContract({ ...vipStakingContract, functionName: 'getVipLevel', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    const { data: taxReduction, isLoading: isLoadingTax } = useReadContract({ ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    const { data: unstakeQueue, isLoading: isLoadingQueue } = useReadContract({ ...vipStakingContract, functionName: 'unstakeQueue', args: [address!], query: { enabled: !!address && !!vipStakingContract } });
    const { data: allowance, isLoading: isLoadingAllowance } = useReadContract({ ...soulShardContract, functionName: 'allowance', args: [address!, vipStakingContract?.address!], query: { enabled: !!address && !!vipStakingContract && !!soulShardContract } });

    // 從讀取的數據中解析出具體的值
    const stakedAmount = useMemo(() => stakeInfo?.[0] ?? 0n, [stakeInfo]);
    const tokenId = useMemo(() => stakeInfo?.[1], [stakeInfo]);
    const pendingUnstakeAmount = useMemo(() => unstakeQueue?.[0] ?? 0n, [unstakeQueue]);
    const unstakeAvailableAt = useMemo(() => Number(unstakeQueue?.[1] ?? 0n), [unstakeQueue]);

    // 使用倒數計時 Hook
    const { isOver: isCooldownOver, formatted: countdown } = useCountdown(unstakeAvailableAt);

    // 組合並回傳所有需要的狀態
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
        unstakeAvailableAt,
        isCooldownOver,
        countdown,
        allowance: allowance ?? 0n,
    };
};
