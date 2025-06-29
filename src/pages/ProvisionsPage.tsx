import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContracts, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther, maxUint256, type Hash } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { fetchAllOwnedNfts } from '../api/nfts';
import { ActionButton } from '../components/ui/ActionButton';
import { NftCard } from '../components/ui/NftCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Page } from '../types/page';
import type { PartyNft } from '../types/nft';
import { useTransactionStore } from '../stores/useTransactionStore';

// 購買儲備的核心邏輯 Hook
const useBuyProvisionsLogic = (quantity: number) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    
    const [approvalTxHash, setApprovalTxHash] = useState<Hash | undefined>();

    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const soulShardContract = getContract(chainId, 'soulShard');

    const { data: provisionPriceUSD, isLoading: isLoadingPrice } = useReadContract({ 
        ...dungeonCoreContract, 
        functionName: 'provisionPriceUSD', 
        query: { enabled: !!dungeonCoreContract } 
    });
    
    const { data: singleUnitPrice } = useReadContract({ 
        ...dungeonCoreContract, 
        functionName: 'getSoulShardAmountForUSD', 
        args: [provisionPriceUSD || 0n], 
        query: { enabled: !!dungeonCoreContract && typeof provisionPriceUSD === 'bigint' } 
    });
    
    // 【優化】根據新的折扣力度更新前端函式
    const getDiscountRate = (q: number): number => {
        if (q >= 30) return 50; // 5折
        if (q >= 14) return 70; // 7折
        if (q >= 7) return 90;  // 9折
        return 100; // 無折扣
    };

    const totalRequiredAmount = useMemo(() => {
        if (typeof singleUnitPrice !== 'bigint' || singleUnitPrice === 0n) return 0n;
        const discountRate = getDiscountRate(quantity);
        // 使用 BigInt 進行整數運算，避免精度問題
        return (singleUnitPrice * BigInt(quantity) * BigInt(discountRate)) / 100n;
    }, [singleUnitPrice, quantity]);
    
    const originalTotalAmount = useMemo(() => {
        if (typeof singleUnitPrice !== 'bigint' || singleUnitPrice === 0n) return 0n;
        return singleUnitPrice * BigInt(quantity);
    }, [singleUnitPrice, quantity]);


    const { data: allowance, refetch: refetchAllowance } = useReadContract({ 
        ...soulShardContract, 
        functionName: 'allowance', 
        args: [address!, dungeonCoreContract?.address!], 
        query: { enabled: !!address && !!dungeonCoreContract && !!soulShardContract } 
    });
    
    const { writeContractAsync: approveAsync, isPending: isApproving } = useWriteContract();
    const { isLoading: isConfirmingApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalTxHash });

    useEffect(() => {
        if (isApprovalSuccess) {
            showToast('授權成功！', 'success');
            refetchAllowance();
            setApprovalTxHash(undefined);
        }
    }, [isApprovalSuccess, refetchAllowance, showToast]);
    
    const needsApproval = useMemo(() => {
        return typeof allowance === 'bigint' && allowance < totalRequiredAmount;
    }, [allowance, totalRequiredAmount]);

    const handleApprove = async () => {
        if (!needsApproval || !dungeonCoreContract || !soulShardContract) return;
        try {
            const hash = await approveAsync({ ...soulShardContract, functionName: 'approve', args: [dungeonCoreContract.address, maxUint256] });
            setApprovalTxHash(hash);
        } catch (err: any) {
            showToast(err.message.split('\n')[0] || '授權失敗', 'error');
        }
    };
    
    return { 
        step: needsApproval ? 'needsApproval' : 'readyToPurchase',
        totalRequiredAmount,
        originalTotalAmount, 
        handleApprove, 
        isLoading: isApproving || isConfirmingApproval || isLoadingPrice,
        discountApplied: getDiscountRate(quantity) < 100,
    };
};

const PurchaseInterface: React.FC<{ selectedParty: PartyNft | null }> = ({ selectedParty }) => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    // 【錯誤修復】移除未被使用的 queryClient
    const { addTransaction } = useTransactionStore();
    const [quantity, setQuantity] = useState(1);
    // 【優化】更新快速選擇按鈕
    const purchaseOptions = [1, 7, 14, 30];

    const { step, totalRequiredAmount, originalTotalAmount, handleApprove, isLoading: isLogicLoading, discountApplied } = useBuyProvisionsLogic(quantity);
    const { writeContractAsync, isPending: isPurchasing } = useWriteContract();

    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const handlePurchase = async () => {
        if (step !== 'readyToPurchase' || !dungeonCoreContract || !selectedParty) return;
        try {
            const hash = await writeContractAsync({
                ...dungeonCoreContract,
                functionName: 'buyProvisions',
                args: [selectedParty.id, BigInt(quantity)],
            });
            addTransaction({ hash, description: `為隊伍 #${selectedParty.id} 購買 ${quantity} 次儲備` });
        } catch (err: any) {
            if (!err.message.includes('User rejected the request')) {
                showToast(err.message.split('\n')[0] || '購買失敗', 'error');
            }
        }
    };

    if (!selectedParty) {
        return <div className="card-bg p-8 rounded-xl h-full flex items-center justify-center"><p className="text-gray-500">請先從左側選擇一個隊伍</p></div>;
    }

    const renderButton = () => {
        const isLoading = isLogicLoading || isPurchasing;
        if (step === 'needsApproval') return <ActionButton onClick={handleApprove} isLoading={isLoading} className="w-full h-12">批准代幣</ActionButton>;
        return <ActionButton onClick={handlePurchase} isLoading={isLoading} disabled={isLoading || step !== 'readyToPurchase'} className="w-full h-12">購買儲備</ActionButton>;
    };

    return (
        <div className="card-bg p-8 rounded-xl h-full flex flex-col">
            <h3 className="section-title text-2xl">為「{selectedParty.name || `隊伍 #${selectedParty.id}`}」購買儲備</h3>
            <p className="text-sm text-gray-500 mb-6">儲備是進行地下城遠征的必要物資。價格固定為每次 5 USD 等值的 $SoulShard。</p>
            
            <div className="mb-6">
                <label className="block text-sm font-bold mb-2">選擇數量 (批量購買享超值折扣！)</label>
                <div className="flex flex-wrap gap-2">
                    {purchaseOptions.map(q => <button key={q} onClick={() => setQuantity(q)} className={`px-4 py-2 rounded-full font-bold transition ${quantity === q ? 'bg-indigo-500 text-white' : 'bg-white/50 hover:bg-white'}`}>{q} 次</button>)}
                </div>
            </div>

            <div className="text-center my-4 flex-grow flex items-center justify-center">
                {isLogicLoading ? <LoadingSpinner/> : (
                    <div>
                        <p className="text-lg">總價:</p>
                        {discountApplied && (
                             <p className="font-bold text-gray-400 text-xl line-through">{parseFloat(formatEther(originalTotalAmount)).toFixed(4)}</p>
                        )}
                        <p className="font-bold text-yellow-500 text-3xl">{parseFloat(formatEther(totalRequiredAmount)).toFixed(4)}</p>
                        <p className="text-xs text-gray-500">$SoulShard</p>
                    </div>
                )}
            </div>
            {renderButton()}
        </div>
    );
};

interface ProvisionsPageProps {
    preselectedPartyId: bigint | null;
    setActivePage: (page: Page) => void;
}


const ProvisionsPage: React.FC<ProvisionsPageProps> = ({ preselectedPartyId, setActivePage }) => {
    const { address, chainId } = useAccount();
    const [selectedPartyId, setSelectedPartyId] = useState<bigint | null>(preselectedPartyId);

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
        query: { 
            enabled: !!ownedParties && ownedParties.length > 0,
            refetchInterval: 10000,
        }
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
    
    const handlePartySelection = (partyId: bigint) => {
        setSelectedPartyId(partyId);
    };

    useEffect(() => {
        if (preselectedPartyId && partiesWithStatus.some(p => p.id === preselectedPartyId)) {
            setSelectedPartyId(preselectedPartyId);
        } else if (partiesWithStatus.length > 0 && !selectedPartyId) {
            setSelectedPartyId(partiesWithStatus[0].id);
        }
    }, [preselectedPartyId, partiesWithStatus, selectedPartyId]);
    
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
                                    <div key={party.id.toString()} onClick={() => handlePartySelection(party.id)} className="cursor-pointer">
                                        <NftCard nft={party} isSelected={selectedPartyId === party.id} />
                                        <p className="text-center text-xs mt-1 font-bold">儲備: {party.provisionsRemaining.toString()}</p>
                                    </div>
                                ))}
                            </div>
                        ) : <EmptyState message="您還沒有任何隊伍可供補給。" buttonText="前往創建隊伍" onButtonClick={() => setActivePage('party')} />
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
