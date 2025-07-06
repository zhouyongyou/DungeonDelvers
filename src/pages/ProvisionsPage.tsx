import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useBalance } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther, maxUint256 } from 'viem';

import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';

import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { bsc, bscTestnet } from 'wagmi/chains'; // ★ 新增：導入 bsc 和 bscTestnet 以便進行型別防衛

interface ProvisionsPageProps {
    preselectedPartyId?: bigint | null;
    onPurchaseSuccess?: () => void;
}

const ProvisionsPage: React.FC<ProvisionsPageProps> = ({ preselectedPartyId, onPurchaseSuccess }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();

    const [selectedPartyId, setSelectedPartyId] = useState<bigint | null>(preselectedPartyId ?? null);
    const [quantity, setQuantity] = useState<number>(1);
    const [paymentSource, setPaymentSource] = useState<'wallet' | 'vault'>('wallet');

    // ★ 核心修正 #1：在元件的開頭加入型別防衛
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return <div className="p-4 text-center text-gray-400">請連接到支援的網路。</div>;
    }

    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const soulShardContract = getContract(chainId, 'soulShard');
    const playerVaultContract = getContract(chainId, 'playerVault');

    // ★ 核心修正 #2：確保所有 wagmi hook 的參數都是型別安全的
    const { data: provisionPriceUSD, isLoading: isLoadingPrice } = useReadContract({
        address: dungeonMasterContract?.address,
        abi: dungeonMasterContract?.abi,
        functionName: 'provisionPriceUSD',
        query: { enabled: !!dungeonMasterContract && dungeonMasterContract.address.startsWith('0x') },
    });

    const { data: requiredAmount, isLoading: isLoadingConversion } = useReadContract({
        address: dungeonCoreContract?.address,
        abi: dungeonCoreContract?.abi,
        functionName: 'getSoulShardAmountForUSD',
        args: [(provisionPriceUSD as bigint) || 0n],
        query: { enabled: !!dungeonCoreContract && typeof provisionPriceUSD === 'bigint' },
    });

    const totalRequiredAmount = useMemo(() => {
        if (!requiredAmount) return 0n;
        return requiredAmount * BigInt(quantity);
    }, [requiredAmount, quantity]);

    const { data: walletBalance } = useBalance({
        address,
        token: soulShardContract?.address,
        query: { enabled: !!address && !!soulShardContract && soulShardContract.address.startsWith('0x') }
    });

    const { data: vaultInfo } = useReadContract({
        address: playerVaultContract?.address,
        abi: playerVaultContract?.abi,
        functionName: 'playerInfo',
        args: [address!],
        query: { enabled: !!address && !!playerVaultContract && playerVaultContract.address.startsWith('0x'), refetchInterval: 5000 },
    });
    const vaultBalance = useMemo(() => (Array.isArray(vaultInfo) ? vaultInfo[0] as bigint : 0n), [vaultInfo]);
    
    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId),
        enabled: !!address,
    });

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: soulShardContract?.address,
        abi: soulShardContract?.abi,
        functionName: 'allowance',
        args: [address!, dungeonMasterContract?.address!],
        query: { enabled: !!address && !!soulShardContract && soulShardContract.address.startsWith('0x') && !!dungeonMasterContract && dungeonMasterContract.address.startsWith('0x') && paymentSource === 'wallet' },
    });

    const needsApproval = useMemo(() => {
        if (paymentSource !== 'wallet' || typeof allowance !== 'bigint' || !totalRequiredAmount) return false;
        return allowance < totalRequiredAmount;
    }, [paymentSource, allowance, totalRequiredAmount]);

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    const handlePurchase = async () => {
        if (!selectedPartyId || !dungeonMasterContract || !dungeonMasterContract.address.startsWith('0x')) return;
        
        const balance = paymentSource === 'wallet' ? (walletBalance?.value ?? 0n) : vaultBalance;
        if (balance < totalRequiredAmount) return showToast(`${paymentSource === 'wallet' ? '錢包' : '金庫'}餘額不足`, 'error');
        if (paymentSource === 'wallet' && needsApproval) return showToast(`請先完成授權`, 'error');

        try {
            const hash = await writeContractAsync({
                address: dungeonMasterContract.address,
                abi: dungeonMasterContract.abi,
                functionName: 'buyProvisions',
                args: [selectedPartyId, BigInt(quantity)],
            });
            addTransaction({ hash, description: `為隊伍 #${selectedPartyId} 購買 ${quantity} 個儲備` });
            onPurchaseSuccess?.();
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "購買失敗", "error");
            }
        }
    };
    
    const handleApprove = async () => {
        if (!soulShardContract || !dungeonMasterContract) return;
        try {
            const hash = await writeContractAsync({
                address: soulShardContract.address,
                abi: soulShardContract.abi,
                functionName: 'approve',
                args: [dungeonMasterContract.address, maxUint256],
            });
            addTransaction({ hash, description: '批准儲備合約' });
            setTimeout(() => refetchAllowance(), 2000);
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "授權失敗", "error");
            }
        }
    };
    
    const isLoading = isLoadingNfts || isLoadingPrice || isLoadingConversion;

    if (isLoading) {
        return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>;
    }

    if (!nfts || nfts.parties.length === 0) {
        return <EmptyState message="您還沒有任何隊伍可以購買儲備。" />;
    }

    return (
        <div className="p-4 space-y-4">
            <div>
                <label htmlFor="party-select" className="block text-sm font-medium text-gray-300 mb-1">選擇隊伍</label>
                <select
                    id="party-select"
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
                <label htmlFor="quantity-select" className="block text-sm font-medium text-gray-300 mb-1">購買數量</label>
                <input
                    type="number"
                    id="quantity-select"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="w-full p-2 border rounded-lg bg-gray-800 border-gray-600 text-white"
                />
            </div>
            
            <div className="w-full my-4">
                <label className="block text-sm font-medium mb-2 text-center text-gray-400">選擇支付方式</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded-lg">
                    <button onClick={() => setPaymentSource('wallet')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'wallet' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>錢包支付</button>
                    <button onClick={() => setPaymentSource('vault')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'vault' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>金庫支付 (免稅)</button>
                </div>
                 <p className="text-xs text-center mt-2 text-gray-500">
                    {paymentSource === 'wallet' ? '錢包餘額' : '金庫餘額'}: {parseFloat(formatEther(paymentSource === 'wallet' ? (walletBalance?.value ?? 0n) : vaultBalance)).toFixed(4)} $SoulShard
                </p>
            </div>

            <div className="text-center p-4 bg-black/20 rounded-lg">
                <p className="text-gray-400">總價:</p>
                <p className="font-bold text-yellow-400 text-2xl">
                    {isLoadingPrice || isLoadingConversion ? <LoadingSpinner size="h-6 w-6" /> : `${parseFloat(formatEther(totalRequiredAmount)).toFixed(4)} $SoulShard`}
                </p>
            </div>
            
            {paymentSource === 'wallet' && needsApproval ? (
                 <ActionButton onClick={handleApprove} isLoading={isTxPending} className="w-full h-12">
                    批准代幣
                </ActionButton>
            ) : (
                <ActionButton onClick={handlePurchase} isLoading={isTxPending} disabled={!selectedPartyId} className="w-full h-12">
                    購買儲備
                </ActionButton>
            )}
        </div>
    );
};

export default ProvisionsPage;
