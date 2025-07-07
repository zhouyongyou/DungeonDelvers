// src/pages/ProvisionsPage.tsx (The Graph 改造版)

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useBalance } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther, maxUint256 } from 'viem';

import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';

import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { bsc } from 'wagmi/chains';

// =================================================================
// Section: 數據獲取 Hook
// =================================================================

type PaymentSource = 'wallet' | 'vault';

// ★ 核心改造：建立一個專門的 Hook 來處理購買儲備的所有邏輯
const useProvisionsLogic = (quantity: number, paymentSource: PaymentSource) => {
    const { address, chainId } = useAccount();

    const dungeonMasterContract = getContract(chainId as any, 'dungeonMaster');
    const dungeonCoreContract = getContract(chainId as any, 'dungeonCore');
    const soulShardContract = getContract(chainId as any, 'soulShard');
    const playerVaultContract = getContract(chainId as any, 'playerVault');

    // 為了簡化，我們暫時保留 RPC 呼叫來獲取價格。
    // 在一個完整的重構中，這會被一個 GraphQL 查詢取代。
    const { data: provisionPriceUSD, isLoading: isLoadingPrice } = useReadContract({
        ...dungeonMasterContract,
        functionName: 'provisionPriceUSD',
        query: { enabled: !!dungeonMasterContract },
    });

    const { data: requiredAmount, isLoading: isLoadingConversion } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'getSoulShardAmountForUSD',
        args: [typeof provisionPriceUSD === 'bigint' ? provisionPriceUSD * BigInt(quantity) : 0n],
        query: { enabled: !!dungeonCoreContract && typeof provisionPriceUSD === 'bigint' && quantity > 0 },
    });

    const { data: walletBalance } = useBalance({ address, token: soulShardContract?.address });
    const { data: vaultInfo } = useReadContract({ ...playerVaultContract, functionName: 'playerInfo', args: [address!] });
    const vaultBalance = useMemo(() => (Array.isArray(vaultInfo) ? vaultInfo[0] as bigint : 0n), [vaultInfo]);

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        ...soulShardContract,
        functionName: 'allowance',
        args: [address!, dungeonMasterContract?.address!],
        query: { enabled: !!address && !!soulShardContract && !!dungeonMasterContract && paymentSource === 'wallet' },
    });

    const needsApproval = useMemo(() => {
        if (paymentSource !== 'wallet' || typeof allowance !== 'bigint' || typeof requiredAmount !== 'bigint') return false;
        return allowance < requiredAmount;
    }, [paymentSource, allowance, requiredAmount]);

    return {
        isLoading: isLoadingPrice || isLoadingConversion,
        totalRequiredAmount: requiredAmount ?? 0n,
        balance: paymentSource === 'wallet' ? (walletBalance?.value ?? 0n) : vaultBalance,
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
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();

    const [selectedPartyId, setSelectedPartyId] = useState<bigint | null>(preselectedPartyId ?? null);
    const [quantity, setQuantity] = useState<number>(1);
    const [paymentSource, setPaymentSource] = useState<PaymentSource>('wallet');

    if (!chainId || chainId !== bsc.id) {
        return <div className="p-4 text-center text-gray-400">請連接到支援的網路。</div>;
    }

    const { 
        isLoading, totalRequiredAmount, balance, needsApproval, 
        dungeonMasterContract, soulShardContract, refetchAllowance 
    } = useProvisionsLogic(quantity, paymentSource);

    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId),
        enabled: !!address,
    });

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    const handlePurchase = async () => {
        if (!selectedPartyId || !dungeonMasterContract) return;
        if (typeof balance === 'bigint' && typeof totalRequiredAmount === 'bigint' && balance < totalRequiredAmount) {
            return showToast(`${paymentSource === 'wallet' ? '錢包' : '金庫'}餘額不足`, 'error');
        }
        if (paymentSource === 'wallet' && needsApproval) return showToast(`請先完成授權`, 'error');

        try {
            // ★ 核心改造：不再需要區分支付來源，因為合約內部會處理
            const hash = await writeContractAsync({
                address: dungeonMasterContract.address,
                abi: dungeonMasterContract.abi,
                functionName: 'buyProvisions',
                args: [selectedPartyId, BigInt(quantity)],
            });
            addTransaction({ hash, description: `為隊伍 #${selectedPartyId} 購買 ${quantity} 個儲備` });
            // 成功後，手動觸發相關查詢的刷新
            queryClient.invalidateQueries({ queryKey: ['playerParties', address, chainId] });
            onPurchaseSuccess?.();
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) showToast(e.shortMessage || "購買失敗", "error");
        }
    };
    
    const handleApprove = async () => {
        if (!soulShardContract || !dungeonMasterContract) return;
        try {
            const hash = await writeContractAsync({ address: soulShardContract.address, abi: soulShardContract.abi, functionName: 'approve', args: [dungeonMasterContract.address, maxUint256] });
            addTransaction({ hash, description: '批准儲備合約' });
            await refetchAllowance();
            showToast('授權成功！', 'success');
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) showToast(e.shortMessage || "授權失敗", "error");
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
            <div>
                <label htmlFor="party-select" className="block text-sm font-medium text-gray-300 mb-1">選擇隊伍</label>
                <select id="party-select" value={selectedPartyId?.toString() ?? ''} onChange={(e) => setSelectedPartyId(e.target.value ? BigInt(e.target.value) : null)} className="w-full p-2 border rounded-lg bg-gray-800 border-gray-600 text-white">
                    <option value="">-- 請選擇一個隊伍 --</option>
                    {nfts.parties.map(party => ( <option key={party.id.toString()} value={party.id.toString()}>{party.name} (ID: {party.id.toString()})</option> ))}
                </select>
            </div>
            <div>
                <label htmlFor="quantity-select" className="block text-sm font-medium text-gray-300 mb-1">購買數量</label>
                <input type="number" id="quantity-select" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" className="w-full p-2 border rounded-lg bg-gray-800 border-gray-600 text-white" />
            </div>
            <div className="w-full my-4">
                <label className="block text-sm font-medium mb-2 text-center text-gray-400">選擇支付方式</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded-lg">
                    <button onClick={() => setPaymentSource('wallet')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'wallet' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>錢包支付</button>
                    <button onClick={() => setPaymentSource('vault')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'vault' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>金庫支付 (免稅)</button>
                </div>
                 <p className="text-xs text-center mt-2 text-gray-500">{paymentSource === 'wallet' ? '錢包餘額' : '金庫餘額'}: {parseFloat(formatEther(balance)).toFixed(4)} $SoulShard</p>
            </div>
            <div className="text-center p-4 bg-black/20 rounded-lg">
                <p className="text-gray-400">總價:</p>
                <p className="font-bold text-yellow-400 text-2xl">{isLoading ? <LoadingSpinner size="h-6 w-6" /> : `${parseFloat(formatEther(typeof totalRequiredAmount === 'bigint' ? totalRequiredAmount : 0n)).toFixed(4)} $SoulShard`}</p>
            </div>
            {paymentSource === 'wallet' && needsApproval ? (
                 <ActionButton onClick={handleApprove} isLoading={isTxPending} className="w-full h-12">批准代幣</ActionButton>
            ) : (
                <ActionButton onClick={handlePurchase} isLoading={isTxPending} disabled={!selectedPartyId} className="w-full h-12">購買儲備</ActionButton>
            )}
        </div>
    );
};

export default ProvisionsPage;
