// useRewardManager.ts - 統一的獎勵管理 Hook

import { useWriteContract, useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '../contexts/SimpleToastContext';
import { getContractWithABI } from '../config/contractsWithABI';
import { formatEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { logger } from '../utils/logger';
import { useEventPolling } from '../utils/eventPolling';
import { useEffect } from 'react';

interface UseRewardManagerProps {
    partyId: bigint;
    chainId: number;
}

export const useRewardManager = ({ partyId, chainId }: UseRewardManagerProps) => {
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    
    const dungeonStorageContract = getContractWithABI('DUNGEONSTORAGE');
    const dungeonMasterContract = getContractWithABI('DUNGEONMASTER');
    
    // 讀取隊伍狀態（包含未領取獎勵）
    const { data: partyStatus, refetch: refetchStatus, isLoading: isLoadingStatus } = useReadContract({
        address: dungeonStorageContract?.address,
        abi: dungeonStorageContract?.abi,
        functionName: 'getPartyStatus',
        args: [partyId],
        query: {
            enabled: !!dungeonStorageContract && !!partyId,
            refetchInterval: 30000, // 減少到每30秒刷新
            staleTime: 20000, // 增加快取時間
        }
    });
    
    // 領取獎勵
    const { 
        writeContract: claimRewards, 
        isPending: isClaimPending,
        isSuccess: isClaimSuccess,
        error: claimError 
    } = useWriteContract({
        mutation: {
            onSuccess: () => {
                showToast('🎉 獎勵領取成功！', 'success');
                // 刷新所有相關查詢
                refetchStatus();
                queryClient.invalidateQueries({ queryKey: ['playerVault'] });
                queryClient.invalidateQueries({ queryKey: ['playerParties'] });
                queryClient.invalidateQueries({ queryKey: ['recentExpeditions'] });
                queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
            },
            onError: (error) => {
                showToast(`領取失敗: ${error.message}`, 'error');
                logger.error('Claim rewards failed:', error);
            }
        }
    });
    
    // 使用事件輪詢替代 useWatchContractEvent
    useEffect(() => {
        if (!dungeonMasterContract?.address || chainId !== bsc.id || !partyId) return;

        // 監聽出征完成事件
        const handleExpeditionLogs = (logs: any[]) => {
            logs.forEach((log) => {
                const { args } = log;
                if (!args) return;
                
                if (args.partyId === partyId) {
                    const success = args.success;
                    const reward = args.reward;
                    const expGained = args.expGained;
                    
                    logger.info('Expedition completed for party:', {
                        partyId: partyId.toString(),
                        success,
                        reward: formatEther(reward),
                        expGained: expGained.toString()
                    });
                    
                    // 刷新狀態
                    setTimeout(() => {
                        refetchStatus();
                        queryClient.invalidateQueries({ queryKey: ['playerParties'] });
                    }, 2000);
                }
            });
        };

        // 監聽獎勵領取事件
        const handleRewardsBankedLogs = (logs: any[]) => {
            logs.forEach((log) => {
                const { args } = log;
                if (!args) return;
                
                if (args.partyId === partyId) {
                    logger.info('Rewards banked for party:', {
                        partyId: partyId.toString(),
                        amount: formatEther(args.amount)
                    });
                    
                    // 刷新狀態
                    refetchStatus();
                    queryClient.invalidateQueries({ queryKey: ['playerVault'] });
                }
            });
        };

        // 註冊事件監聽
        const unsubscribeExpedition = useEventPolling(
            `ExpeditionFulfilled-RewardManager-${partyId}`,
            dungeonMasterContract.address,
            'event ExpeditionFulfilled(indexed address player, indexed uint256 partyId, bool success, uint256 reward, uint256 expGained)',
            handleExpeditionLogs,
            true
        );

        const unsubscribeRewards = useEventPolling(
            `RewardsBanked-RewardManager-${partyId}`,
            dungeonMasterContract.address,
            'event RewardsBanked(indexed address player, indexed uint256 partyId, uint256 amount)',
            handleRewardsBankedLogs,
            true
        );

        return () => {
            unsubscribeExpedition();
            unsubscribeRewards();
        };
    }, [dungeonMasterContract?.address, chainId, partyId, refetchStatus, queryClient]);
    
    
    // Debug log
    if (partyStatus) {
        logger.info('[useRewardManager] Party status:', {
            partyId: partyId.toString(),
            partyStatus,
            isArray: Array.isArray(partyStatus),
            length: Array.isArray(partyStatus) ? partyStatus.length : 'not array',
            provisionsRemaining: Array.isArray(partyStatus) && partyStatus[0] !== undefined ? partyStatus[0]?.toString() : 'N/A',
            cooldownEndsAt: Array.isArray(partyStatus) && partyStatus[1] !== undefined ? partyStatus[1]?.toString() : 'N/A',
            unclaimedRewards: Array.isArray(partyStatus) && partyStatus[2] !== undefined ? partyStatus[2]?.toString() : 'N/A',
            fatigueLevel: Array.isArray(partyStatus) && partyStatus[3] !== undefined ? partyStatus[3]?.toString() : 'N/A',
        });
    }
    
    // 處理不同的數據結構（可能是對象或數組）
    let unclaimedRewards = 0n;
    if (partyStatus) {
        if (Array.isArray(partyStatus)) {
            // 確保索引 2 存在且不是 undefined
            if (partyStatus.length > 2 && partyStatus[2] !== undefined && partyStatus[2] !== null) {
                try {
                    unclaimedRewards = BigInt(partyStatus[2].toString());
                } catch (error) {
                    logger.error('[useRewardManager] Error parsing unclaimed rewards:', {
                        error,
                        value: partyStatus[2],
                        type: typeof partyStatus[2]
                    });
                    unclaimedRewards = 0n;
                }
            } else {
                logger.warn('[useRewardManager] Party status array too short or value is null:', {
                    length: partyStatus.length,
                    value: partyStatus[2]
                });
            }
        } else if (typeof partyStatus === 'object' && 'unclaimedRewards' in partyStatus) {
            try {
                unclaimedRewards = BigInt(partyStatus.unclaimedRewards.toString());
            } catch (error) {
                logger.error('[useRewardManager] Error parsing unclaimed rewards from object:', {
                    error,
                    value: partyStatus.unclaimedRewards
                });
                unclaimedRewards = 0n;
            }
        }
    }
    
    const hasRewards = unclaimedRewards > 0n;
    
    logger.info('[useRewardManager] 解析後的獎勵:', {
        partyId: partyId.toString(),
        unclaimedRewards: unclaimedRewards.toString(),
        hasRewards
    });
    
    const handleClaimRewards = () => {
        // 移除 hasRewards 檢查，讓玩家即使在顯示 0 時也能嘗試領取
        if (!dungeonMasterContract) return;
        
        claimRewards({
            address: dungeonMasterContract.address as `0x${string}`,
            abi: dungeonMasterContract.abi,
            functionName: 'claimRewards',
            args: [partyId]
        });
    };
    
    return {
        unclaimedRewards,
        hasRewards,
        claimRewards: handleClaimRewards,
        isClaimPending,
        isClaimSuccess,
        claimError,
        refetchStatus,
        isLoadingRewards: isLoadingStatus,
    };
};