// src/pages/MyAssetsPage.tsx (UI優化與排序修正版)

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllOwnedNfts } from '../api/nfts';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { HeroNft, RelicNft, NftType, AnyNft } from '../types/nft';
import { formatEther } from 'viem';
import { bsc } from 'wagmi/chains';

// =================================================================
// Section: 子元件 (TeamBuilder)
// =================================================================

interface TeamBuilderProps {
  heroes: HeroNft[];
  relics: RelicNft[];
  onCreateParty: (heroIds: bigint[], relicIds: bigint[]) => void;
  isCreating: boolean;
  platformFee?: bigint;
}

const TeamBuilder: React.FC<TeamBuilderProps> = ({ heroes, relics, onCreateParty, isCreating, platformFee = 0n }) => {
    const [selectedHeroes, setSelectedHeroes] = useState<bigint[]>([]);
    const [selectedRelics, setSelectedRelics] = useState<bigint[]>([]);

    const toggleSelection = (id: bigint, type: 'hero' | 'relic') => {
        const list = type === 'hero' ? selectedHeroes : selectedRelics;
        const setList = type === 'hero' ? setSelectedHeroes : setSelectedRelics;
        const limit = 5;

        if (list.includes(id)) {
            setList(list.filter(i => i !== id));
        } else if (list.length < limit) {
            setList([...list, id]);
        }
    };

    const { totalPower, totalCapacity } = useMemo(() => {
        const power = selectedHeroes.reduce((acc, id) => {
            const hero = heroes.find(h => h.id === id);
            return acc + (hero ? hero.power : 0);
        }, 0);
        const capacity = selectedRelics.reduce((acc, id) => {
            const relic = relics.find(r => r.id === id);
            return acc + (relic ? relic.capacity : 0);
        }, 0);
        return { totalPower: power, totalCapacity: capacity };
    }, [selectedHeroes, selectedRelics, heroes, relics]);

    const canCreate = selectedHeroes.length > 0 && selectedRelics.length > 0 && selectedHeroes.length <= totalCapacity;

    return (
        <div className="card-bg p-4 md:p-6 rounded-2xl shadow-xl">
            <h3 className="section-title">創建新隊伍</h3>
            <p className="text-sm text-gray-400 mb-4">選擇英雄和聖物來組建你的冒險隊伍。隊伍的英雄數量不能超過聖物的總容量。</p>
            
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6 mb-4">
                <div>
                    <h4 className="font-semibold text-lg mb-2 text-white">選擇英雄 ({selectedHeroes.length}/5)</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-black/20 p-2 rounded-lg min-h-[100px]">
                        {heroes.length > 0 ? heroes.map(hero => (
                            <NftCard 
                                key={`select-${hero.id}`} 
                                nft={hero} 
                                onSelect={() => toggleSelection(hero.id, 'hero')} 
                                isSelected={selectedHeroes.includes(hero.id)} 
                            />
                        )) : (
                            <div className="col-span-full">
                                <EmptyState message="沒有可用的英雄">
                                    <a href="#/mint">
                                        <ActionButton className="mt-2">前往鑄造</ActionButton>
                                    </a>
                                </EmptyState>
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-lg mb-2 text-white">選擇聖物 ({selectedRelics.length}/5)</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-black/20 p-2 rounded-lg min-h-[100px]">
                        {relics.length > 0 ? relics.map(relic => (
                            <NftCard 
                                key={`select-${relic.id}`} 
                                nft={relic} 
                                onSelect={() => toggleSelection(relic.id, 'relic')} 
                                isSelected={selectedRelics.includes(relic.id)} 
                            />
                        )) : (
                             <div className="col-span-full">
                                <EmptyState message="沒有可用的聖物">
                                     <a href="#/mint">
                                        <ActionButton className="mt-2">前往鑄造</ActionButton>
                                    </a>
                                </EmptyState>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-900/50 p-4 rounded-lg">
                <div className="flex gap-6 text-center">
                    <div>
                        <p className="text-sm text-gray-400">總戰力</p>
                        <p className="text-2xl font-bold text-indigo-400">{totalPower}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">英雄/容量</p>
                        <p className={`text-2xl font-bold ${selectedHeroes.length > totalCapacity ? 'text-red-500' : 'text-teal-400'}`}>
                            {selectedHeroes.length}/{totalCapacity}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-center sm:items-end mt-4 sm:mt-0">
                    <ActionButton 
                        onClick={() => onCreateParty(selectedHeroes, selectedRelics)} 
                        isLoading={isCreating}
                        disabled={!canCreate || isCreating}
                        className="w-full sm:w-48 h-12"
                    >
                        創建隊伍
                    </ActionButton>
                    <p className="text-xs text-yellow-400 mt-1 text-center sm:text-right">注意：創建後資產將被綁定，此操作目前不可逆。</p>
                    <p className="text-xs text-gray-500 mt-1">費用: {formatEther(platformFee)} BNB</p>
                </div>
            </div>
        </div>
    );
};

// =================================================================
// Section: 主頁面元件
// =================================================================

const MyAssetsPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const publicClient = usePublicClient();
    const queryClient = useQueryClient();

    const [filter, setFilter] = useState<NftType>('party');

    if (!chainId || chainId !== bsc.id) {
        return <div className="flex justify-center items-center h-64"><EmptyState message="請連接到支援的網路 (BSC) 以檢視您的資產。" /></div>;
    }

    const heroContract = getContract(bsc.id, 'hero');
    const relicContract = getContract(bsc.id, 'relic');
    const partyContract = getContract(bsc.id, 'party');

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    const { data: nfts, isLoading } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId),
        enabled: !!address && !!chainId,
    });
    
    const { data: platformFeeRaw } = useReadContract({
        ...partyContract,
        functionName: 'platformFee',
        query: { enabled: !!partyContract }
    });
    const platformFee = typeof platformFeeRaw === 'bigint' ? platformFeeRaw : undefined;

    const { availableHeroes, availableRelics } = useMemo((): { availableHeroes: HeroNft[]; availableRelics: RelicNft[] } => {
        if (!nfts) return { availableHeroes: [], availableRelics: [] };
        
        const heroIdsInParties = new Set(nfts.parties.flatMap(p => p.heroIds.map(id => id.toString())));
        const relicIdsInParties = new Set(nfts.parties.flatMap(p => p.relicIds.map(id => id.toString())));

        // ★ 新增：依稀有度排序
        const sortHeroes = (nfts: HeroNft[]) => [...nfts].sort((a, b) => b.rarity - a.rarity);
        const sortRelics = (nfts: RelicNft[]) => [...nfts].sort((a, b) => b.rarity - a.rarity);

        return {
            availableHeroes: sortHeroes(nfts.heroes.filter(h => !heroIdsInParties.has(h.id.toString()))),
            availableRelics: sortRelics(nfts.relics.filter(r => !relicIdsInParties.has(r.id.toString()))),
        };
    }, [nfts]);

    const filteredNfts = useMemo(() => {
        if (!nfts) return [];
        // ★ 新增：依稀有度排序
        const sortNfts = (nfts: AnyNft[]) => [...nfts].sort((a, b) => ('rarity' in b ? (b as any).rarity : 0) - ('rarity' in a ? (a as any).rarity : 0));

        switch (filter) {
            case 'hero': return sortNfts(nfts.heroes);
            case 'relic': return sortNfts(nfts.relics);
            case 'party': return [...nfts.parties].sort((a, b) => b.partyRarity - a.partyRarity);
            case 'vip': return nfts.vipCards; // VIP卡通常只有一張，無需排序
            default: return [];
        }
    }, [filter, nfts]);

    const handleCreateParty = async (heroIds: bigint[], relicIds: bigint[]) => {
        if (!partyContract || !heroContract || !relicContract || !address || !publicClient) return;
        
        try {
            const checkAndRequestApproval = async (nftContract: any, type: '英雄' | '聖物') => {
                const isApproved = await publicClient.readContract({
                    ...nftContract,
                    functionName: 'isApprovedForAll',
                    args: [address, partyContract.address],
                });

                if (!isApproved) {
                    showToast(`需要授權${type}合約`, 'info');
                    const approveHash = await writeContractAsync({ ...nftContract, functionName: 'setApprovalForAll', args: [partyContract.address, true] });
                    addTransaction({ hash: approveHash, description: `授權隊伍合約使用${type}` });
                    await publicClient.waitForTransactionReceipt({ hash: approveHash });
                    showToast(`${type}授權成功！`, 'success');
                }
            };
            
            if (heroIds.length > 0) await checkAndRequestApproval(heroContract, '英雄');
            if (relicIds.length > 0) await checkAndRequestApproval(relicContract, '聖物');

            const hash = await writeContractAsync({
                ...partyContract,
                functionName: 'createParty',
                args: [heroIds, relicIds],
                value: platformFee,
            });
            addTransaction({ hash, description: `創建新隊伍` });
            queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] });

        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "創建隊伍失敗", "error");
            }
        }
    };
    
    const filterOptions: { key: NftType; label: string }[] = [
        { key: 'party', label: '我的隊伍' },
        { key: 'hero', label: '我的英雄' },
        { key: 'relic', label: '我的聖物' },
        { key: 'vip', label: '我的VIP卡' },
    ];

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <section className="space-y-8">
            <h2 className="page-title">我的資產與隊伍</h2>
            
            {/* ★ UI/UX 優化：將組隊面板移至最上方 */}
            <TeamBuilder 
                heroes={availableHeroes} 
                relics={availableRelics}
                onCreateParty={handleCreateParty}
                isCreating={isTxPending}
                platformFee={platformFee}
            />

            <div className="card-bg p-4 md:p-6 rounded-2xl shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                    <h3 className="section-title">我的收藏</h3>
                    <div className="flex items-center gap-1 sm:gap-2 bg-gray-900/50 p-1 rounded-lg mt-2 sm:mt-0">
                        {filterOptions.map(({ key, label }) => (
                            <button 
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition ${filter === key ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                {filteredNfts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredNfts.map(nft => <NftCard key={nft.id.toString()} nft={nft} />)}
                    </div>
                ) : (
                    <EmptyState message="這裡空空如也..." />
                )}
            </div>
        </section>
    );
};

export default MyAssetsPage;
