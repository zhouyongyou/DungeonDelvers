// src/components/ExpeditionResults.tsx
// 出征結果和獎勵領取組件

import React, { useEffect } from 'react';
import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import { formatEther } from 'viem';
import { getContract } from '../config/contracts';
import { ActionButton } from './ui/ActionButton';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { bsc } from 'wagmi/chains';

interface ExpeditionResultsProps {
    partyId: bigint;
    chainId: number;
}

export const ExpeditionResults: React.FC<ExpeditionResultsProps> = ({ partyId, chainId }) => {
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
            enabled: !!dungeonStorageContract,
            refetchInterval: 10000, // 每10秒刷新
        }
    });
    
    // 領取獎勵
    const { writeContract: claimRewards, isPending: isClaimPending } = useWriteContract({
        mutation: {
            onSuccess: () => {
                showToast('獎勵領取成功！', 'success');
                refetchStatus();
                queryClient.invalidateQueries({ queryKey: ['playerVault'] });
            },
            onError: (error) => {
                showToast(`領取失敗: ${error.message}`, 'error');
            }
        }
    });
    
    // 監聽出征完成事件
    useWatchContractEvent({
        address: dungeonMasterContract?.address,
        abi: dungeonMasterContract?.abi,
        eventName: 'ExpeditionFulfilled',
        onLogs(logs) {
            logs.forEach((log) => {
                const { args } = log as any;
                if (args?.partyId === partyId) {
                    const success = args.success;
                    const reward = args.reward;
                    const expGained = args.expGained;
                    
                    if (success) {
                        showToast(
                            `🎉 出征成功！獲得 ${formatEther(reward)} SOUL 和 ${expGained} 經驗值`,
                            'success'
                        );
                    } else {
                        showToast(
                            `😢 出征失敗... 獲得 ${expGained} 經驗值`,
                            'error'
                        );
                    }
                    
                    // 刷新狀態
                    setTimeout(() => {
                        refetchStatus();
                        queryClient.invalidateQueries({ queryKey: ['playerParties'] });
                    }, 2000);
                }
            });
        },
    });
    
    const unclaimedRewards = partyStatus?.[2] || 0n;
    const hasRewards = unclaimedRewards > 0n;
    
    const handleClaimRewards = () => {
        if (!dungeonMasterContract) return;
        
        claimRewards({
            address: dungeonMasterContract.address as `0x${string}`,
            abi: dungeonMasterContract.abi,
            functionName: 'claimRewards',
            args: [partyId]
        });
    };
    
    if (!hasRewards) return null;
    
    return (
        <div className="mt-3 p-3 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-600/30">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-yellow-300 font-medium">未領取獎勵</p>
                    <p className="text-lg font-bold text-white">
                        {formatEther(unclaimedRewards)} SOUL
                    </p>
                </div>
                <ActionButton
                    onClick={handleClaimRewards}
                    isLoading={isClaimPending}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 py-2"
                >
                    領取獎勵
                </ActionButton>
            </div>
        </div>
    );
};