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
    
    const dungeonStorageContract = getContract('DUNGEONSTORAGE');
    const dungeonMasterContract = getContract('DUNGEONMASTER');
    
    // 批量讀取所有隊伍的獎勵狀態
    const partyStatusCalls = parties?.map(party => ({
        address: dungeonStorageContract?.address as `0x${string}`,
        abi: dungeonStorageContract?.abi,
        functionName: 'getPartyStatus',
        args: [party.id]
    })) || [];
    
    const { data: partyStatuses, isLoading: isLoadingStatuses } = useReadContracts({
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
        if (!parties || !dungeonMasterContract) {
            logger.error('[useBatchOperations] 缺少必要數據:', {
                parties: !!parties,
                dungeonMasterContract: !!dungeonMasterContract
            });
            return;
        }
        
        // 找出有獎勵可領取的隊伍
        const partiesWithRewards: { partyId: bigint; rewards: bigint }[] = [];
        
        // 優先從子圖數據獲取獎勵信息
        parties.forEach((party) => {
            if (party.unclaimedRewards > 0n) {
                partiesWithRewards.push({
                    partyId: party.id,
                    rewards: party.unclaimedRewards
                });
            }
        });
        
        // 如果子圖沒有數據，再檢查合約數據
        if (partiesWithRewards.length === 0 && partyStatuses) {
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
        }
        
        if (partiesWithRewards.length === 0) {
            showToast('沒有可領取的獎勵', 'info');
            return;
        }
        
        const totalRewards = partiesWithRewards.reduce((sum, p) => sum + p.rewards, 0n);
        showToast(`正在領取 ${partiesWithRewards.length} 支隊伍的獎勵，總計 ${formatSoul(totalRewards)} SOUL`, 'info');
        
        logger.info('[useBatchOperations] 準備領取獎勵:', {
            隊伍數量: partiesWithRewards.length,
            總獎勵: formatSoul(totalRewards),
            詳情: partiesWithRewards
        });
        
        // 使用 Promise.all 並行領取，但限制並發數
        const batchSize = 3; // 每批次處理3個
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < partiesWithRewards.length; i += batchSize) {
            const batch = partiesWithRewards.slice(i, i + batchSize);
            
            const results = await Promise.allSettled(
                batch.map(({ partyId }) => 
                    writeContract({
                        address: dungeonMasterContract.address as `0x${string}`,
                        abi: dungeonMasterContract.abi,
                        functionName: 'claimRewards',
                        args: [partyId]
                    })
                )
            );
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    successCount++;
                    logger.info(`成功領取隊伍 #${batch[index].partyId} 的獎勵`);
                } else {
                    errorCount++;
                    logger.error(`領取隊伍 #${batch[index].partyId} 的獎勵失敗:`, result.reason);
                }
            });
            
            // 批次之間短暫延遲
            if (i + batchSize < partiesWithRewards.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // 顯示結果
        if (successCount > 0) {
            showToast(`🎉 成功領取 ${successCount} 支隊伍的獎勵！`, 'success');
        }
        if (errorCount > 0) {
            showToast(`⚠️ ${errorCount} 支隊伍的獎勵領取失敗`, 'error');
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
        
        // 首先檢查從子圖獲取的數據（parties 中的 unclaimedRewards）
        const hasRewardsFromGraph = parties?.some(party => party.unclaimedRewards > 0n) || false;
        
        // 然後檢查從合約讀取的數據
        const hasRewardsFromContract = partyStatuses.some(status => {
            if (status.status === 'success' && status.result) {
                const unclaimedRewards = (status.result as any)?.[2] || 0n;
                return unclaimedRewards > 0n;
            }
            return false;
        });
        
        // 任一來源有獎勵就返回 true
        return hasRewardsFromGraph || hasRewardsFromContract;
    };
    
    return {
        claimAllRewards,
        getTotalClaimableRewards,
        hasClaimableRewards: hasClaimableRewards(),
        isProcessing: isWriting,
        isLoadingStatuses,
    };
};