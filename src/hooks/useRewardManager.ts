// useRewardManager.ts - 統一的獎勵管理 Hook

import { useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '../contexts/SimpleToastContext';
import { getContract } from '../config/contracts';
import { formatEther } from 'viem';
import { createEventWatchConfig } from '../utils/rpcErrorHandler';
import { bsc } from 'wagmi/chains';
import { logger } from '../utils/logger';

interface UseRewardManagerProps {
    partyId: bigint;
    chainId: number;
}

export const useRewardManager = ({ partyId, chainId }: UseRewardManagerProps) => {
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    
    const dungeonStorageContract = getContract(chainId, 'dungeonStorage');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    
    // 讀取隊伍狀態（包含未領取獎勵）
    const { data: partyStatus, refetch: refetchStatus } = useReadContract({
        address: dungeonStorageContract?.address,
        abi: dungeonStorageContract?.abi,
        functionName: 'getPartyStatus',
        args: [partyId],
        query: {
            enabled: !!dungeonStorageContract && !!partyId,
            refetchInterval: 10000, // 每10秒刷新
            staleTime: 5000,
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
    
    // 監聽出征完成事件
    useWatchContractEvent({
        address: dungeonMasterContract?.address,
        abi: dungeonMasterContract?.abi,
        eventName: 'ExpeditionFulfilled',
        ...createEventWatchConfig('ExpeditionFulfilled-RewardManager', 'high', {
            enabled: chainId === bsc.id && !!dungeonMasterContract?.address && !!partyId,
        }),
        onLogs(logs) {
            logs.forEach((log) => {
                const { args } = log as any;
                if (args?.partyId === partyId) {
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
        },
    });
    
    // 監聽獎勵領取事件
    useWatchContractEvent({
        address: dungeonMasterContract?.address,
        abi: dungeonMasterContract?.abi,
        eventName: 'RewardsBanked',
        ...createEventWatchConfig('RewardsBanked-RewardManager', 'high', {
            enabled: chainId === bsc.id && !!dungeonMasterContract?.address && !!partyId,
        }),
        onLogs(logs) {
            logs.forEach((log) => {
                const { args } = log as any;
                if (args?.partyId === partyId) {
                    logger.info('Rewards banked for party:', {
                        partyId: partyId.toString(),
                        amount: formatEther(args.amount)
                    });
                    
                    // 刷新狀態
                    refetchStatus();
                    queryClient.invalidateQueries({ queryKey: ['playerVault'] });
                }
            });
        },
    });
    
    const unclaimedRewards = partyStatus?.[2] || 0n;
    const hasRewards = unclaimedRewards > 0n;
    
    // 調試日誌
    logger.info('useRewardManager - Party rewards status:', {
        partyId: partyId.toString(),
        partyStatus: partyStatus,
        unclaimedRewards: unclaimedRewards.toString(),
        hasRewards
    });
    
    const handleClaimRewards = () => {
        if (!dungeonMasterContract || !hasRewards) return;
        
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
    };
};