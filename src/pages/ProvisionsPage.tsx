import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContracts, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther, maxUint256, type Hash } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { fetchAllOwnedNfts } from '../api/nfts';
import { ActionButton } from '../components/ui/ActionButton';
import { NftCard } from '../components/ui/NftCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { PartyNft } from '../types/nft';

// ----------------------------------------------------------------
// 1. 購買儲備的核心邏輯 Hook
// ----------------------------------------------------------------
type PurchaseStep = 'idle' | 'loading' | 'needsApproval' | 'approving' | 'approveConfirming' | 'readyToPurchase';

const useBuyProvisionsLogic = (quantity: number) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    // [修正] 移除了此處未使用的 queryClient
    
    const [step, setStep] = useState<PurchaseStep>('idle');
    const [approvalTxHash, setApprovalTxHash] = useState<Hash | undefined>();

    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const soulShardContract = getContract(chainId, 'soulShard');

    const { data: provisionPriceUSD } = useReadContract({ ...dungeonCoreContract, functionName: 'provisionPriceUSD', query: { enabled: !!dungeonCoreContract } });
    const { data: singleUnitPrice } = useReadContract({ ...dungeonCoreContract, functionName: 'getSoulShardAmountForUSD', args: [provisionPriceUSD || 0n], query: { enabled: !!dungeonCoreContract && typeof provisionPriceUSD === 'bigint' } });
    
    const totalRequiredAmount = useMemo(() => (typeof singleUnitPrice === 'bigint' ? singleUnitPrice * BigInt(quantity) : 0n), [singleUnitPrice, quantity]);

    const { data: allowance, refetch: refetchAllowance } = useReadContract({ ...soulShardContract, functionName: 'allowance', args: [address!, dungeonCoreContract?.address!], query: { enabled: !!address && !!dungeonCoreContract && !!soulShardContract } });
    
    const { writeContractAsync: approveAsync, isPending: isApproving } = useWriteContract();
    const { isLoading: isConfirmingApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalTxHash });

    useEffect(() => {
        if (isApprovalSuccess) {
            showToast('授權成功！', 'success');
            refetchAllowance();
            setApprovalTxHash(undefined);
        }
    }, [isApprovalSuccess, refetchAllowance, showToast]);

    useEffect(() => {
        if (!address || typeof allowance !== 'bigint' || totalRequiredAmount <= 0n) {
            setStep('idle');
            return;
        }
        if (isConfirmingApproval) { setStep('approveConfirming'); return; }
        setStep(allowance >= totalRequiredAmount ? 'readyToPurchase' : 'needsApproval');
    }, [address, allowance, totalRequiredAmount, isConfirmingApproval]);

    const handleApprove = async () => {
        if (step !== 'needsApproval' || !dungeonCoreContract || !soulShardContract) return;
        setStep('approving');
        try {
            const hash = await approveAsync({ ...soulShardContract, functionName: 'approve', args: [dungeonCoreContract.address, maxUint256] });
            setApprovalTxHash(hash);
        } catch (err: any) {
            showToast(err.message.split('\n')[0] || '授權失敗', 'error');
            setStep('needsApproval');
        }
    };
    
    return { step, totalRequiredAmount, handleApprove, isLoading: isApproving || isConfirmingApproval };
};


// ----------------------------------------------------------------
// 2. 購買介面 (右側)
// ----------------------------------------------------------------
const PurchaseInterface: React.FC<{ selectedParty: PartyNft | null }> = ({ selectedParty }) => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    const [quantity, setQuantity] = useState(1);
    const purchaseOptions = [1, 7, 15, 30];

    const { step, totalRequiredAmount, handleApprove, isLoading: isLogicLoading } = useBuyProvisionsLogic(quantity);
    const { writeContractAsync, isPending: isPurchasing } = useWriteContract();

    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const handlePurchase = async () => {
        if (step !== 'readyToPurchase' || !dungeonCoreContract || !selectedParty) return;
        try {
            await writeContractAsync({
                ...dungeonCoreContract,
                functionName: 'buyProvisions',
                args: [selectedParty.id, BigInt(quantity)],
            });
            showToast(`成功為隊伍 #${selectedParty.id} 購買 ${quantity} 次儲備！`, 'success');
            queryClient.invalidateQueries({ queryKey: ['partyStatuses'] });
        } catch (err: any) {
            showToast(err.message.split('\n')[0] || '購買失敗', 'error');
        }
    };

    if (!selectedParty) {
        return <div className="card-bg p-8 rounded-xl h-full flex items-center justify-center"><p className="text-gray-500">請先從左側選擇一個隊伍</p></div>;
    }

    const renderButton = () => {
        const isLoading = isLogicLoading || isPurchasing;
        if (step === 'needsApproval') return <ActionButton onClick={handleApprove} isLoading={isLoading} className="w-full h-12">批准代幣</ActionButton>;
        if (step === 'approving' || step === 'approveConfirming') return <ActionButton isLoading className="w-full h-12">授權中...</ActionButton>;
        return <ActionButton onClick={handlePurchase} isLoading={isLoading} disabled={isLoading || step !== 'readyToPurchase'} className="w-full h-12">購買儲備</ActionButton>;
    };

    return (
        <div className="card-bg p-8 rounded-xl h-full flex flex-col">
            <h3 className="section-title text-2xl">為「{selectedParty.name || `隊伍 #${selectedParty.id}`}」購買儲備</h3>
            <p className="text-sm text-gray-500 mb-6">儲備是進行地下城遠征的必要物資。</p>
            
            <div className="mb-6">
                <label className="block text-sm font-bold mb-2">選擇數量</label>
                <div className="flex flex-wrap gap-2">
                    {purchaseOptions.map(q => <button key={q} onClick={() => setQuantity(q)} className={`px-4 py-2 rounded-full font-bold transition ${quantity === q ? 'bg-indigo-500 text-white' : 'bg-white/50 hover:bg-white'}`}>{q} 次</button>)}
                </div>
                <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="mt-4 w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"/>
            </div>

            <div className="text-center my-4 flex-grow flex items-center justify-center">
                {isLogicLoading ? <LoadingSpinner/> : (
                    <div>
                        <p className="text-lg">總價:</p>
                        <p className="font-bold text-yellow-500 text-3xl">{totalRequiredAmount > 0 ? parseFloat(formatEther(totalRequiredAmount)).toFixed(4) : '...'}</p>
                        <p className="text-xs text-gray-500">$SoulShard</p>
                    </div>
                )}
            </div>

            {renderButton()}
        </div>
    );
};

// ----------------------------------------------------------------
// 3. 主頁面元件
// ----------------------------------------------------------------
const ProvisionsPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const [selectedPartyId, setSelectedPartyId] = useState<bigint | null>(null);

    const { data: ownedParties, isLoading: isLoadingParties } = useQuery({
        queryKey: ['ownedNfts', address, chainId, 'partiesOnly'],
        queryFn: async () => {
            if (!address || !chainId) return [];
            return (await fetchAllOwnedNfts(address, chainId)).parties as PartyNft[];
        },
        enabled: !!address && !!chainId,
    });
    
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const { data: statuses } = useReadContracts({
        contracts: ownedParties?.map(p => ({ ...dungeonCoreContract, functionName: 'partyStatuses', args: [p.id] })) ?? [],
        query: { enabled: !!ownedParties && ownedParties.length > 0 }
    });

    const partiesWithStatus = useMemo(() => {
        if (!ownedParties || !statuses) return [];
        return ownedParties.map((party, index) => {
            const statusResult = statuses[index];
            if (statusResult.status === 'success' && Array.isArray(statusResult.result)) {
                return { ...party, provisionsRemaining: statusResult.result[0] as bigint };
            }
            return { ...party, provisionsRemaining: 0n };
        });
    }, [ownedParties, statuses]);
    
    const selectedParty = useMemo(() => partiesWithStatus.find(p => p.id === selectedPartyId) || null, [partiesWithStatus, selectedPartyId]);

    return (
        <section>
            <h2 className="page-title">遠征補給站</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h3 className="section-title">選擇您的隊伍</h3>
                    {isLoadingParties ? <LoadingSpinner/> : (
                        partiesWithStatus.length > 0 ? (
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {partiesWithStatus.map(party => (
                                    <div key={party.id.toString()} onClick={() => setSelectedPartyId(party.id)} className="cursor-pointer">
                                        <NftCard nft={party} isSelected={selectedPartyId === party.id} />
                                        <p className="text-center text-xs mt-1 font-bold">儲備: {party.provisionsRemaining.toString()}</p>
                                    </div>
                                ))}
                            </div>
                        ) : <EmptyState message="您還沒有任何隊伍可供補給。" />
                    )}
                </div>
                <div className="lg:col-span-2">
                     <PurchaseInterface selectedParty={selectedParty} />
                </div>
            </div>
        </section>
    );
};

export default ProvisionsPage;