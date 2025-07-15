// src/pages/ProvisionsPage.tsx (The Graph 改造版)

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther, maxUint256 } from 'viem';

import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';

import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { bsc } from 'wagmi/chains';

// =================================================================
// Section: 數據獲取 Hook
// =================================================================

// ★ 簡化的 Hook：只處理錢包支付，因為合約已改為直接從錢包扣款
const useProvisionsLogic = (quantity: number) => {
    const { address, chainId } = useAccount();
    const isChainSupported = chainId === bsc.id;

    const dungeonMasterContract = getContract(isChainSupported ? chainId : bsc.id, 'dungeonMaster');
    const dungeonCoreContract = getContract(isChainSupported ? chainId : bsc.id, 'dungeonCore');
    const soulShardContract = getContract(isChainSupported ? chainId : bsc.id, 'soulShard');

    // 獲取儲備價格
    const { data: provisionPriceUSD, isLoading: isLoadingPrice } = useReadContract({
                address: dungeonMasterContract?.address as `0x${string}`,
        abi: dungeonMasterContract?.abi,
        functionName: 'provisionPriceUSD',
        query: { enabled: !!dungeonMasterContract },
    });

    // 計算所需的 SoulShard 數量
    const { data: requiredAmount, isLoading: isLoadingConversion } = useReadContract({
                address: dungeonCoreContract?.address as `0x${string}`,
        abi: dungeonCoreContract?.abi,
        functionName: 'getSoulShardAmountForUSD',
        args: [typeof provisionPriceUSD === 'bigint' ? provisionPriceUSD * BigInt(quantity) : 0n],
        query: { enabled: !!dungeonCoreContract && typeof provisionPriceUSD === 'bigint' && quantity > 0 },
    });

    // 獲取錢包餘額
    const { data: walletBalance } = useBalance({ address, token: soulShardContract?.address });

    // 檢查授權額度
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
                address: soulShardContract?.address as `0x${string}`,
        abi: soulShardContract?.abi,
        functionName: 'allowance',
        args: [address!, dungeonMasterContract?.address],
        query: { enabled: !!address && !!soulShardContract && !!dungeonMasterContract },
    });

    // 判斷是否需要授權
    const needsApproval = useMemo(() => {
        if (typeof allowance !== 'bigint' || typeof requiredAmount !== 'bigint') return false;
        return allowance < requiredAmount;
    }, [allowance, requiredAmount]);

    return {
        isLoading: isLoadingPrice || isLoadingConversion,
        totalRequiredAmount: requiredAmount ?? 0n,
        walletBalance: walletBalance?.value ?? 0n,
        needsApproval,
        dungeonMasterContract,
        soulShardContract,
        refetchAllowance,
    };
};

// =================================================================
// Section: 主頁面元件
// =================================================================

interface ProvisionsPageProps {
    preselectedPartyId?: bigint | null;
    onPurchaseSuccess?: () => void;
}

const ProvisionsPage: React.FC<ProvisionsPageProps> = ({ preselectedPartyId, onPurchaseSuccess }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();

    const [selectedPartyId, setSelectedPartyId] = useState<bigint | null>(preselectedPartyId ?? null);
    const [quantity, setQuantity] = useState<number>(1);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [currentTransactionType, setCurrentTransactionType] = useState<'purchase' | 'approve'>('purchase');

    // Move all hooks before early returns
    const { 
        isLoading, totalRequiredAmount, walletBalance, needsApproval, 
        dungeonMasterContract, soulShardContract, refetchAllowance 
    } = useProvisionsLogic(quantity);

    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId!),
        enabled: !!address && !!chainId,
        
        // 🔥 NFT缓存策略 - 内联配置以避免部署问题
        staleTime: 1000 * 60 * 30, // 30分钟内新鲜
        gcTime: 1000 * 60 * 60 * 2, // 2小时垃圾回收
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: 'always',
        retry: 2,
    });

    // 交易進度 Hooks - 購買儲備
    const { execute: executePurchase, progress: purchaseProgress, reset: resetPurchase } = useTransactionWithProgress({
        onSuccess: () => {
            showToast(`為隊伍 #${selectedPartyId} 購買 ${quantity} 個儲備成功！`, 'success');
            queryClient.invalidateQueries({ queryKey: ['playerParties', address, chainId] });
            queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });
            onPurchaseSuccess?.();
            setShowProgressModal(false);
            confirmPurchaseUpdate();
        },
        onError: () => {
            rollbackPurchaseUpdate();
        },
        successMessage: '購買儲備成功！',
        errorMessage: '購買儲備失敗',
    });
    
    // 交易進度 Hooks - 授權
    const { execute: executeApprove, progress: approveProgress, reset: resetApprove } = useTransactionWithProgress({
        onSuccess: () => {
            showToast('授權成功！現在可以購買儲備了', 'success');
            refetchAllowance();
            setShowProgressModal(false);
            confirmApproveUpdate();
        },
        onError: () => {
            rollbackApproveUpdate();
        },
        successMessage: '授權成功！',
        errorMessage: '授權失敗',
    });
    
    // 樂觀更新 - 購買儲備
    const { optimisticUpdate: optimisticPurchaseUpdate, confirmUpdate: confirmPurchaseUpdate, rollback: rollbackPurchaseUpdate } = useOptimisticUpdate({
        queryKey: ['playerParties', address, chainId],
        updateFn: (oldData: any) => {
            if (!oldData || !selectedPartyId) return oldData;
            
            // 更新指定隊伍的儲備數量
            return oldData.map((party: any) => {
                if (party.id === selectedPartyId || party.tokenId === selectedPartyId) {
                    return {
                        ...party,
                        provisionsRemaining: (party.provisionsRemaining || 0n) + BigInt(quantity)
                    };
                }
                return party;
            });
        }
    });
    
    // 樂觀更新 - 授權
    const { optimisticUpdate: optimisticApproveUpdate, confirmUpdate: confirmApproveUpdate, rollback: rollbackApproveUpdate } = useOptimisticUpdate({
        queryKey: ['allowance'],
        updateFn: () => maxUint256 // 立即設為最大授權額度
    });
    
    // 獲取當前進度
    const currentProgress = currentTransactionType === 'purchase' ? purchaseProgress : approveProgress;
    const isTxPending = currentProgress.status !== 'idle' && currentProgress.status !== 'error';

    // Early returns after all hooks
    if (!chainId || chainId !== bsc.id) {
        return <div className="p-4 text-center text-gray-400">請連接到支援的網路。</div>;
    }

    const handlePurchase = async () => {
        if (!selectedPartyId || !dungeonMasterContract) return;
        if (typeof walletBalance === 'bigint' && typeof totalRequiredAmount === 'bigint' && walletBalance < totalRequiredAmount) {
            return showToast('錢包餘額不足', 'error');
        }
        if (needsApproval) return showToast('請先完成授權', 'error');
        
        setCurrentTransactionType('purchase');
        setShowProgressModal(true);
        resetPurchase();
        
        // 立即執行樂觀更新
        optimisticPurchaseUpdate();
        
        try {
            await executePurchase(
                {
                    address: dungeonMasterContract.address,
                    abi: dungeonMasterContract.abi,
                    functionName: 'buyProvisions',
                    args: [selectedPartyId, BigInt(quantity)]
                },
                `為隊伍 #${selectedPartyId} 購買 ${quantity} 個儲備`
            );
        } catch (error) {
            // 錯誤已在 hook 中處理
        }
    };
    
    const handleApprove = async () => {
        if (!soulShardContract || !dungeonMasterContract) return;
        
        setCurrentTransactionType('approve');
        setShowProgressModal(true);
        resetApprove();
        
        // 立即執行樂觀更新
        optimisticApproveUpdate();
        
        try {
            await executeApprove(
                {
                    address: soulShardContract.address,
                    abi: soulShardContract.abi,
                    functionName: 'approve',
                    args: [dungeonMasterContract.address, maxUint256]
                },
                '授權 DungeonMaster 合約使用 $SoulShard'
            );
        } catch (error) {
            // 錯誤已在 hook 中處理
        }
    };
    
    if (isLoadingNfts) {
        return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>;
    }

    if (!nfts || nfts.parties.length === 0) {
        return <EmptyState message="您還沒有任何隊伍可以購買儲備。" />;
    }

    return (
        <div className="p-4 space-y-4">
            <TransactionProgressModal
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
                progress={currentProgress}
                title={currentTransactionType === 'purchase' ? '購買儲備進度' : '授權進度'}
            />
            <div>
                <label htmlFor="party-select" className="block text-sm font-medium text-gray-300 mb-1">選擇隊伍</label>
                <select 
                    id="party-select" 
                    name="party-select"
                    value={selectedPartyId?.toString() ?? ''} 
                    onChange={(e) => setSelectedPartyId(e.target.value ? BigInt(e.target.value) : null)} 
                    className="w-full p-2 border rounded-lg bg-gray-800 border-gray-600 text-white"
                >
                    <option value="">-- 請選擇一個隊伍 --</option>
                    {nfts.parties.map(party => ( 
                        <option key={party.id.toString()} value={party.id.toString()}>
                            {party.name} (ID: {party.id.toString()})
                        </option> 
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-300 mb-1">購買數量</label>
                <input 
                    type="number" 
                    id="quantity-input" 
                    name="quantity-input"
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                    min="1" 
                    className="w-full p-2 border rounded-lg bg-gray-800 border-gray-600 text-white" 
                />
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                <div className="text-sm text-gray-400">錢包餘額</div>
                <div className="font-mono text-lg text-white">
                    {parseFloat(formatEther(walletBalance)).toFixed(4)} $SoulShard
                </div>
            </div>
            <div className="text-center p-4 bg-black/20 rounded-lg">
                <div className="text-gray-400">總價:</div>
                <div className="font-bold text-yellow-400 text-2xl">
                    {isLoading ? <LoadingSpinner size="h-6 w-6" /> : `${parseFloat(formatEther(typeof totalRequiredAmount === 'bigint' ? totalRequiredAmount : 0n)).toFixed(4)} $SoulShard`}
                </div>
            </div>
            {needsApproval ? (
                <div className="space-y-3">
                    <div className="p-3 bg-orange-900/50 rounded-lg border border-orange-500/50">
                        <div className="text-sm text-orange-300 text-center">
                            ⚠️ 首次購買需要授權 DungeonMaster 合約使用您的 $SoulShard
                        </div>
                    </div>
                    <ActionButton onClick={handleApprove} isLoading={isTxPending} className="w-full h-12">
                        {isTxPending ? '授權中...' : '授權代幣'}
                    </ActionButton>
                </div>
            ) : (
                <ActionButton onClick={handlePurchase} isLoading={isTxPending} disabled={!selectedPartyId} className="w-full h-12">
                    {isTxPending ? '購買儲備中...' : '購買儲備'}
                </ActionButton>
            )}
        </div>
    );
};

export default ProvisionsPage;
