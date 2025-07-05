import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatEther, type Hash } from 'viem';
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

// =================================================================
// Section: 購買儲備的核心邏輯 Hook
// =================================================================
const useBuyProvisionsLogic = (quantity: number) => {
    const { address, chainId } = useAccount();
    
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const playerVaultContract = getContract(chainId, 'playerVault');

    // 1. 從 DungeonMaster 獲取儲備的單價 (USD)
    const { data: provisionPriceUSD, isLoading: isLoadingPrice } = useReadContract({ 
        ...dungeonMasterContract, 
        functionName: 'provisionPriceUSD', 
        query: { enabled: !!dungeonMasterContract } 
    });
    
    // 2. 獲取 PlayerVault 合約地址，以便後續查詢
    const { data: playerVaultAddress } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'playerVaultAddress',
        query: { enabled: !!dungeonCoreContract }
    });
    
    // 3. 獲取 PlayerVault 合約中的 SoulShard 代幣地址
    const { data: soulShardTokenAddress } = useReadContract({
        address: playerVaultAddress,
        abi: playerVaultContract?.abi,
        functionName: 'soulShardToken',
        query: { enabled: !!playerVaultAddress && !!playerVaultContract }
    });

    // 4. 根據 USD 價格，計算需要多少 SoulShard
    const { data: singleUnitPrice, isLoading: isLoadingConversion } = useReadContract({ 
        ...dungeonCoreContract, 
        functionName: 'getSoulShardAmountForUSD', 
        args: [provisionPriceUSD || 0n], 
        query: { enabled: !!dungeonCoreContract && typeof provisionPriceUSD === 'bigint' } 
    });
    
    // 5. 計算總價
    const totalRequiredAmount = useMemo(() => {
        if (typeof singleUnitPrice !== 'bigint') return 0n;
        return singleUnitPrice * BigInt(quantity);
    }, [singleUnitPrice, quantity]);
    
    return { 
        totalRequiredAmount,
        isLoading: isLoadingPrice || isLoadingConversion,
    };
};

// =================================================================
// Section: 購買介面子元件
// =================================================================
const PurchaseInterface: React.FC<{ selectedParty: PartyNft | null }> = ({ selectedParty }) => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const [quantity, setQuantity] = useState(1);
    const purchaseOptions = [1, 7, 14, 30];

    const { totalRequiredAmount, isLoading: isLogicLoading } = useBuyProvisionsLogic(quantity);
    const { writeContractAsync, isPending: isPurchasing } = useWriteContract();

    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');

    const handlePurchase = async () => {
        if (!dungeonMasterContract || !selectedParty) return;
        try {
            const hash = await writeContractAsync({
                ...dungeonMasterContract,
                functionName: 'buyProvisions',
                args: [selectedParty.id, BigInt(quantity)],
            });
            addTransaction({ hash, description: `為隊伍 #${selectedParty.id} 購買 ${quantity} 次儲備` });
        } catch (err: any) {
            if (!err.message.includes('User rejected the request')) {
                showToast(err.shortMessage || '購買失敗', 'error');
            }
        }
    };

    if (!selectedParty) {
        return <div className="card-bg p-8 rounded-xl h-full flex items-center justify-center"><p className="text-gray-500">請先從左側選擇一個隊伍</p></div>;
    }

    return (
        <div className="card-bg p-8 rounded-xl h-full flex flex-col">
            <h3 className="section-title text-2xl">為「{selectedParty.name || `隊伍 #${selectedParty.id}`}」購買儲備</h3>
            <p className="text-sm text-gray-500 mb-6">儲備是進行地下城遠征的必要物資。每次購買都將從您的**遊戲內金庫**扣款。</p>
            
            <div className="mb-6">
                <label className="block text-sm font-bold mb-2">選擇數量</label>
                <div className="flex flex-wrap gap-2">
                    {purchaseOptions.map(q => <button key={q} onClick={() => setQuantity(q)} className={`px-4 py-2 rounded-full font-bold transition ${quantity === q ? 'bg-indigo-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}>{q} 次</button>)}
                </div>
            </div>

            <div className="text-center my-4 flex-grow flex items-center justify-center">
                {isLogicLoading ? <LoadingSpinner/> : (
                    <div>
                        <p className="text-lg">總價:</p>
                        <p className="font-bold text-yellow-500 text-3xl">{parseFloat(formatEther(totalRequiredAmount)).toFixed(4)}</p>
                        <p className="text-xs text-gray-500">$SoulShard</p>
                    </div>
                )}
            </div>
            <ActionButton onClick={handlePurchase} isLoading={isPurchasing || isLogicLoading} className="w-full h-12">確認購買</ActionButton>
        </div>
    );
};

// =================================================================
// Section: ProvisionsPage 主元件
// =================================================================
const ProvisionsPage: React.FC<{
    preselectedPartyId: bigint | null;
    setActivePage: (page: Page) => void;
}> = ({ preselectedPartyId, setActivePage }) => {
    const { address, chainId } = useAccount();
    const [selectedPartyId, setSelectedPartyId] = useState<bigint | null>(preselectedPartyId);

    const { data: ownedParties, isLoading: isLoadingParties } = useQuery({
        queryKey: ['ownedNfts', address, chainId, 'partiesOnly'],
        queryFn: async () => (await fetchAllOwnedNfts(address!, chainId!)).parties as PartyNft[],
        enabled: !!address && !!chainId,
    });
    
    const dungeonStorageContract = getContract(chainId, 'dungeonStorage');
    const { data: statuses } = useReadContracts({
        contracts: ownedParties?.map(p => ({ ...dungeonStorageContract, functionName: 'getPartyStatus', args: [p.id] })) ?? [],
        query: { 
            enabled: !!ownedParties && ownedParties.length > 0 && !!dungeonStorageContract,
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
                                    <div key={party.id.toString()} onClick={() => setSelectedPartyId(party.id)} className="cursor-pointer">
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
