// src/hooks/useVipStatus.ts (修正後)

import { useAccount, useReadContract, useBalance, useReadContracts } from 'wagmi';
// import { useMonitoredReadContracts } from './useMonitoredContract';
import { useMemo, useEffect } from 'react';
import { bsc } from 'wagmi/chains';
import { getContract } from '../config/contracts';
import { useCountdown } from './useCountdown';
import { logger } from '../utils/logger';

// 格式化冷卻期的輔助函數
const formatCooldownPeriod = (cooldownPeriod: any): string => {
    if (cooldownPeriod === undefined || cooldownPeriod === null) return '讀取中...';
    
    const seconds = Number(cooldownPeriod);
    
    if (seconds < 60) {
        return `${seconds} 秒`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return remainingSeconds > 0 ? `${minutes} 分 ${remainingSeconds} 秒` : `${minutes} 分鐘`;
    } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const remainingMinutes = Math.floor((seconds % 3600) / 60);
        return remainingMinutes > 0 ? `${hours} 小時 ${remainingMinutes} 分鐘` : `${hours} 小時`;
    } else {
        const days = Math.floor(seconds / 86400);
        const remainingHours = Math.floor((seconds % 86400) / 3600);
        return remainingHours > 0 ? `${days} 天 ${remainingHours} 小時` : `${days} 天`;
    }
};

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
        
        if (!contract) {
            logger.error('無法獲取 VIP Staking 合約配置', { chainId });
            return null;
        }
        
        logger.debug('VIP Staking 合約配置:', { 
            address: contract.address,
            hasAbi: !!contract.abi,
            abiLength: contract.abi?.length
        });

        return contract;
    }, [chainId, isSupportedChain]);
    
    const soulShardContract = useMemo(() => {
        if (!isSupportedChain) return null;
        const contract = getContract(chainId, 'soulShard');
        
        if (!contract) {
            logger.error('無法獲取 SoulShard 合約配置', { chainId });
            return null;
        }
        
        logger.debug('SoulShard 合約配置:', { 
            address: contract.address,
            hasAbi: !!contract.abi,
            abiLength: contract.abi?.length
        });
        
        return contract;
    }, [chainId, isSupportedChain]);
    
    const oracleContract = useMemo(() => {
        if (!isSupportedChain) return null;
        const contract = getContract(chainId, 'oracle');
        
        if (!contract) {
            logger.error('無法獲取 Oracle 合約配置', { chainId });
            return null;
        }
        
        return contract;
    }, [chainId, isSupportedChain]);

    // 讀取鏈上數據
    const { data: soulShardBalance, isLoading: isLoadingBalance, refetch: refetchBalance } = useBalance({ 
        address, 
        token: soulShardContract?.address, 
        query: { 
            enabled: !!address && !!soulShardContract,
            // 🔄 餘額查詢快取配置
            staleTime: 1000 * 60 * 2, // 2分鐘 - 餘額需要較新的數據
            gcTime: 1000 * 60 * 10,   // 10分鐘
            refetchOnWindowFocus: false,
            retry: 2,
        }
    });
    
    // ★ 核心修正 #1: 使用合約方法獲取 VIP 等級和稅率減免（增強錯誤處理）
    const vipContracts = useMemo(() => {
        if (!vipStakingContract || !soulShardContract || !address) {
            logger.debug('VIP 合約配置不完整', { 
                hasVipStaking: !!vipStakingContract,
                hasSoulShard: !!soulShardContract,
                hasAddress: !!address
            });
            return [];
        }
        
        // 確保合約對象包含必要屬性
        if (!vipStakingContract.address || !vipStakingContract.abi) {
            logger.error('VIP Staking 合約配置無效', { vipStakingContract });
            return [];
        }
        
        if (!soulShardContract.address || !soulShardContract.abi) {
            logger.error('SoulShard 合約配置無效', { soulShardContract });
            return [];
        }
        
        try {
            const contracts = [
                { 
                    address: vipStakingContract.address as `0x${string}`,
                    abi: vipStakingContract.abi,
                    functionName: 'userStakes',
                    args: [address]
                },
                { 
                    address: vipStakingContract.address as `0x${string}`,
                    abi: vipStakingContract.abi,
                    functionName: 'unstakeQueue',
                    args: [address]
                },
                { 
                    address: soulShardContract.address as `0x${string}`,
                    abi: soulShardContract.abi,
                    functionName: 'allowance',
                    args: [address, vipStakingContract.address as `0x${string}`]
                },
                { 
                    address: vipStakingContract.address as `0x${string}`,
                    abi: vipStakingContract.abi,
                    functionName: 'getVipLevel',
                    args: [address]
                },
                { 
                    address: vipStakingContract.address as `0x${string}`,
                    abi: vipStakingContract.abi,
                    functionName: 'getVipTaxReduction',
                    args: [address]
                },
                { 
                    address: vipStakingContract.address as `0x${string}`,
                    abi: vipStakingContract.abi,
                    functionName: 'unstakeCooldown',
                    args: []
                }
            ];
            
            logger.debug('VIP 合約配置已構建', { 
                contractCount: contracts.length,
                contracts: contracts.map(c => ({ 
                    address: c.address, 
                    functionName: c.functionName,
                    hasArgs: !!c.args,
                    argsLength: c.args?.length || 0
                }))
            });
            
            return contracts;
        } catch (error) {
            logger.error('構建 VIP 合約配置時發生錯誤', { error });
            return [];
        }
    }, [vipStakingContract, soulShardContract, address]);
    
    // VIP 合約讀取 - 直接使用 wagmi 的 useReadContracts
    const { data: vipData, isLoading: isLoadingVipData, error: vipDataError, refetch: refetchVipData } = useReadContracts({
        contracts: vipContracts,
        allowFailure: true,
        query: { 
            enabled: vipContracts.length > 0 && !!address && isSupportedChain,
            // 🔄 VIP 數據快取配置
            staleTime: 1000 * 60 * 10, // 10分鐘 - VIP 狀態變更不頻繁
            gcTime: 1000 * 60 * 30,    // 30分鐘
            refetchOnWindowFocus: false, // 避免切換視窗時重新請求
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(3000 * 2 ** attemptIndex, 30000), // 更慢的重試：3秒、6秒、12秒，最多30秒
            throwOnError: false, // 防止錯誤導致頁面崩潰
        }
    });

    const [
        stakeInfo,
        unstakeQueue,
        allowance,
        contractVipLevel,
        contractTaxReduction,
        cooldownPeriod
    ] = useMemo(() => {
        if (!vipData || !Array.isArray(vipData)) {
            return [undefined, undefined, undefined, undefined, undefined, undefined];
        }
        return vipData.map(d => d?.result);
    }, [vipData]);

    const stakedAmount = useMemo(() => (stakeInfo as readonly [bigint, bigint])?.[0] ?? 0n, [stakeInfo]);
    const tokenId = useMemo(() => (stakeInfo as readonly [bigint, bigint])?.[1], [stakeInfo]);
    
    // ★ 核心修正 #2: 使用合約方法獲取VIP等級和稅率減免
    const { vipLevel, taxReduction } = useMemo(() => {
        // 優先使用合約返回的數據
        if (contractVipLevel !== undefined && contractTaxReduction !== undefined) {
            const level = Number(contractVipLevel);
            const reduction = BigInt(contractTaxReduction);

            return { vipLevel: level, taxReduction: reduction };
        }
        
        // 如果合約數據不可用，fallback 到前端計算（使用平方根方式）
        if (!stakedAmount || stakedAmount === 0n) {
            return { vipLevel: 0, taxReduction: 0n };
        }
        
        // 假設 stakedValueUSD（這裡需要從 Oracle 獲取，暫時用估算）
        const amountInEther = Number(stakedAmount) / 1e18;
        // 基於你提供的數據：6,314,607 SoulShard ≈ $371.62 USD
        // 計算：$371.62 / 6,314,607 ≈ $0.0000588 per SoulShard
        const estimatedUSD = amountInEther * 0.0000588;

        let level = 0;
        
        if (estimatedUSD >= 100) {
            // 使用平方根計算：level = sqrt(USD / 100)
            level = Math.floor(Math.sqrt(estimatedUSD / 100));
            // 限制最大等級
            level = Math.min(level, 255);
        }
        
        const reduction = level * 50; // 50 BP per level

        return { vipLevel: level, taxReduction: BigInt(reduction) };
    }, [contractVipLevel, contractTaxReduction, stakedAmount]);

    // ★ 核心修正 #2: 確保即使 stakedAmount 為 0，也能安全地觸發後續查詢
    const { data: stakedValueUSD, isLoading: isLoadingStakedValueUSD, refetch: refetchStakedValueUSD } = useReadContract({
        ...oracleContract,
        functionName: 'getAmountOut',
        args: [soulShardContract?.address as `0x${string}`, stakedAmount],
        query: { 
            enabled: !!oracleContract && !!soulShardContract && (stakedAmount > 0n),
            // 🔄 Oracle 價格查詢快取配置
            staleTime: 1000 * 60 * 5, // 5分鐘 - 價格數據需要較新
            gcTime: 1000 * 60 * 15,   // 15分鐘
            refetchOnWindowFocus: false,
            retry: 2,
        }
    });

    const pendingUnstakeAmount = useMemo(() => {
        const amount = (unstakeQueue as readonly [bigint, bigint])?.[0] ?? 0n;
        return amount;
    }, [unstakeQueue]);
    
    const unstakeAvailableAt = useMemo(() => {
        const timestamp = (unstakeQueue as readonly [bigint, bigint])?.[1] ?? 0n;
        const timestampNumber = Number(timestamp);
        return timestampNumber;
    }, [unstakeQueue]);

    const { isOver: isCooldownOver, formatted: countdown } = useCountdown(unstakeAvailableAt);

    // 錯誤處理
    useEffect(() => {
        if (vipDataError) {
            logger.error('VIP數據讀取錯誤:', vipDataError);
        }
    }, [vipDataError]);

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
            logger.error('❌ 刷新VIP狀態時發生錯誤:', error);
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
        unstakeAvailableAt,
        isCooldownOver,
        countdown,
        allowance: allowance ?? 0n,
        cooldownPeriod: cooldownPeriod as bigint | undefined,
        cooldownDays: cooldownPeriod ? Number(cooldownPeriod) / 86400 : 7,
        cooldownFormatted: formatCooldownPeriod(cooldownPeriod),
        refetchAll,
        // 調試信息
        isChainSupported: isSupportedChain,
        hasContracts: !!vipStakingContract && !!soulShardContract,
        contractAddresses: {
            vipStaking: vipStakingContract?.address,
            soulShard: soulShardContract?.address
        }
    };
};
