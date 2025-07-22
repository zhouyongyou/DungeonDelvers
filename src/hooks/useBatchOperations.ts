// useBatchOperations.ts - 批量操作 Hook

import { useWriteContract, useReadContracts } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '../contexts/SimpleToastContext';
import { getContract } from '../config/contracts';
import { formatSoul } from '../utils/formatters';
import { logger } from '../utils/logger';
import type { PartyNft } from '../types/nft';

interface UseBatchOperationsProps {
    parties: (PartyNft & { cooldownEndsAt: bigint })[] | undefined;
    chainId: number;
}

export const useBatchOperations = ({ parties, chainId }: UseBatchOperationsProps) => {
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    
    const dungeonStorageContract = getContract(chainId, 'dungeonStorage');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    
    // 批量讀取所有隊伍的獎勵狀態
    const partyStatusCalls = parties?.map(party => ({
        address: dungeonStorageContract?.address as `0x${string}`,
        abi: dungeonStorageContract?.abi,
        functionName: 'getPartyStatus',
        args: [party.id]
    })) || [];
    
    const { data: partyStatuses } = useReadContracts({
        contracts: partyStatusCalls,
        query: {
            enabled: parties && parties.length > 0 && !!dungeonStorageContract,
            staleTime: 10000,
        }
    });
    
    // 寫入合約的 hook
    const { writeContract, isPending: isWriting } = useWriteContract({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['playerParties'] });
                queryClient.invalidateQueries({ queryKey: ['playerVault'] });
                queryClient.invalidateQueries({ queryKey: ['recentExpeditions'] });
            },
            onError: (error) => {
                showToast(`批量操作失敗: ${error.message}`, 'error');
                logger.error('Batch operation failed:', error);
            }
        }
    });
    
    // 批量領取獎勵
    const claimAllRewards = async () => {
        if (!parties || !partyStatuses || !dungeonMasterContract) return;
        
        // 找出有獎勵可領取的隊伍
        const partiesWithRewards: { partyId: bigint; rewards: bigint }[] = [];
        
        partyStatuses.forEach((status, index) => {
            if (status.status === 'success' && status.result) {
                const unclaimedRewards = (status.result as any)?.[2] || 0n;
                if (unclaimedRewards > 0n) {
                    partiesWithRewards.push({
                        partyId: parties[index].id,
                        rewards: unclaimedRewards
                    });
                }
            }
        });
        
        if (partiesWithRewards.length === 0) {
            showToast('沒有可領取的獎勵', 'info');
            return;
        }
        
        const totalRewards = partiesWithRewards.reduce((sum, p) => sum + p.rewards, 0n);
        showToast(`正在領取 ${partiesWithRewards.length} 支隊伍的獎勵，總計 ${formatSoul(totalRewards)} SOUL`, 'info');
        
        // 逐一領取每個隊伍的獎勵
        let successCount = 0;
        for (const { partyId } of partiesWithRewards) {
            try {
                await writeContract({
                    address: dungeonMasterContract.address as `0x${string}`,
                    abi: dungeonMasterContract.abi,
                    functionName: 'claimRewards',
                    args: [partyId]
                });
                successCount++;
                
                // 短暫延遲避免太快發送交易
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                logger.error(`Failed to claim rewards for party ${partyId}:`, error);
            }
        }
        
        if (successCount > 0) {
            showToast(`🎉 成功領取 ${successCount} 支隊伍的獎勵！`, 'success');
        }
    };
    
    // 計算總可領取獎勵
    const getTotalClaimableRewards = () => {
        if (!partyStatuses) return 0n;
        
        return partyStatuses.reduce((total, status) => {
            if (status.status === 'success' && status.result) {
                const unclaimedRewards = (status.result as any)?.[2] || 0n;
                return total + unclaimedRewards;
            }
            return total;
        }, 0n);
    };
    
    // 檢查是否有可領取的獎勵
    const hasClaimableRewards = () => {
        if (!partyStatuses) return false;
        
        return partyStatuses.some(status => {
            if (status.status === 'success' && status.result) {
                const unclaimedRewards = (status.result as any)?.[2] || 0n;
                return unclaimedRewards > 0n;
            }
            return false;
        });
    };
    
    return {
        claimAllRewards,
        getTotalClaimableRewards,
        hasClaimableRewards: hasClaimableRewards(),
        isProcessing: isWriting,
    };
};