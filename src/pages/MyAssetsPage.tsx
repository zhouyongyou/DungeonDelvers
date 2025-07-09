// src/pages/MyAssetsPage.tsx (組隊UI優化版)

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
import type { AnyNft, HeroNft, RelicNft, NftType } from '../types/nft';
import { formatEther } from 'viem';
import { bsc } from 'wagmi/chains';

// =================================================================
// Section: 子元件 (TeamBuilder) - 優化版
// =================================================================

interface TeamBuilderProps {
  heroes: HeroNft[];
  relics: RelicNft[];
  onCreateParty: (heroIds: bigint[], relicIds: bigint[]) => void;
  isCreating: boolean;
  platformFee?: bigint;
  isLoadingFee: boolean;
  isHeroAuthorized: boolean;
  isRelicAuthorized: boolean;
  onAuthorizeHero: () => void;
  onAuthorizeRelic: () => void;
  isAuthorizing: boolean;
}

const TeamBuilder: React.FC<TeamBuilderProps> = ({ 
  heroes, 
  relics, 
  onCreateParty, 
  isCreating, 
  platformFee, 
  isLoadingFee,
  isHeroAuthorized,
  isRelicAuthorized,
  onAuthorizeHero,
  onAuthorizeRelic,
  isAuthorizing
}: TeamBuilderProps) => {
    const [selectedHeroes, setSelectedHeroes] = useState<bigint[]>([]);
    const [selectedRelics, setSelectedRelics] = useState<bigint[]>([]);
    const { showToast } = useAppToast();

    const { totalPower, totalCapacity } = useMemo(() => {
        const power = selectedHeroes.reduce((acc: number, id: bigint) => {
            const hero = heroes.find(h => h.id === id);
            return acc + (hero ? hero.power : 0);
        }, 0);
        const capacity = selectedRelics.reduce((acc: number, id: bigint) => {
            const relic = relics.find(r => r.id === id);
            return acc + (relic ? relic.capacity : 0);
        }, 0);
        return { totalPower: power, totalCapacity: capacity };
    }, [selectedHeroes, selectedRelics, heroes, relics]);

    const toggleSelection = (id: bigint, type: 'hero' | 'relic') => {
        if (type === 'relic') {
            const list = selectedRelics;
            const setList = setSelectedRelics;
            const limit = 5;

            if (list.includes(id)) {
                setList(list.filter(i => i !== id));
            } else if (list.length < limit) {
                setList([...list, id]);
            } else {
                showToast(`最多只能選擇 ${limit} 個聖物`, 'error');
            }
        } else { // type === 'hero'
            const list = selectedHeroes;
            const setList = setSelectedHeroes;
            const limit = totalCapacity;

            if (list.includes(id)) {
                setList(list.filter(i => i !== id));
            } else if (totalCapacity === 0) {
                showToast('請先選擇聖物以決定隊伍容量', 'info');
            } else if (list.length < limit) {
                setList([...list, id]);
            } else {
                showToast(`英雄數量已達隊伍容量上限 (${limit})`, 'error');
            }
        }
    };

    // 一鍵選擇最強英雄
    const handleAutoSelectHeroes = () => {
        if (totalCapacity === 0) {
            showToast('請先選擇聖物以決定隊伍容量', 'info');
            return;
        }
        
        const sortedHeroes = [...heroes].sort((a, b) => b.power - a.power);
        const selected = sortedHeroes.slice(0, totalCapacity).map(h => h.id);
        setSelectedHeroes(selected);
        showToast(`已自動選擇 ${selected.length} 個最強英雄`, 'success');
    };

    // 一鍵選擇最大容量聖物
    const handleAutoSelectRelics = () => {
        const sortedRelics = [...relics].sort((a, b) => b.capacity - a.capacity);
        const selected = sortedRelics.slice(0, 5).map(r => r.id);
        setSelectedRelics(selected);
        showToast(`已自動選擇 ${selected.length} 個最大容量聖物`, 'success');
    };

    const canCreate = selectedHeroes.length > 0 && selectedRelics.length > 0 && selectedHeroes.length <= totalCapacity && isHeroAuthorized && isRelicAuthorized;

    return (
        <div className="card-bg p-4 md:p-6 rounded-2xl shadow-xl">
            <h3 className="section-title">創建新隊伍</h3>
            <p className="text-sm text-gray-400 mb-4">選擇英雄和聖物來組建你的冒險隊伍。隊伍的英雄數量不能超過聖物的總容量。</p>
            
            {/* 創建隊伍按鈕 - 移到最上方 */}
            <div className="flex justify-center mb-6">
                <ActionButton 
                    onClick={() => onCreateParty(selectedHeroes, selectedRelics)} 
                    isLoading={isCreating}
                    disabled={!canCreate || isCreating}
                    className="w-full sm:w-64 h-12 text-lg"
                >
                    {!isHeroAuthorized || !isRelicAuthorized ? '請先完成授權' : '創建隊伍'}
                </ActionButton>
            </div>
            
            {/* 狀態顯示 */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-900/50 p-4 rounded-lg mb-6">
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
                    <p className="text-xs text-yellow-400 mb-1 text-center sm:text-right">注意：創建後資產將被綁定，此操作目前不可逆。</p>
                    <p className="text-xs text-gray-500 mb-2">費用: {isLoadingFee ? '讀取中...' : formatEther(platformFee ?? 0n)} BNB</p>
                </div>
            </div>

            {/* 授權按鈕區域 - 調整順序：先聖物後英雄 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <ActionButton 
                        onClick={onAuthorizeRelic}
                        isLoading={isAuthorizing}
                        disabled={isRelicAuthorized || isAuthorizing}
                        className={`h-12 flex-1 ${isRelicAuthorized ? 'bg-green-600' : 'bg-yellow-600'}`}
                    >
                        {isRelicAuthorized ? '✓ 聖物已授權' : '授權聖物'}
                    </ActionButton>
                    <ActionButton 
                        onClick={handleAutoSelectRelics}
                        disabled={relics.length === 0}
                        className="h-12 px-4 bg-blue-600 hover:bg-blue-500"
                    >
                        一鍵選擇
                    </ActionButton>
                </div>
                <div className="flex items-center gap-3">
                    <ActionButton 
                        onClick={onAuthorizeHero}
                        isLoading={isAuthorizing}
                        disabled={isHeroAuthorized || isAuthorizing}
                        className={`h-12 flex-1 ${isHeroAuthorized ? 'bg-green-600' : 'bg-yellow-600'}`}
                    >
                        {isHeroAuthorized ? '✓ 英雄已授權' : '授權英雄'}
                    </ActionButton>
                    <ActionButton 
                        onClick={handleAutoSelectHeroes}
                        disabled={heroes.length === 0 || totalCapacity === 0}
                        className="h-12 px-4 bg-blue-600 hover:bg-blue-500"
                    >
                        一鍵選擇
                    </ActionButton>
                </div>
            </div>

            <div className="flex flex-col md:grid md:grid-cols-2 gap-6 mb-4">
                <div>
                    <h4 className="font-semibold text-lg mb-2 text-white">選擇聖物 (上限: 5)</h4>
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
                <div>
                    <h4 className="font-semibold text-lg mb-2 text-white">選擇英雄 (上限: {totalCapacity})</h4>
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
    const [isAuthorizing, setIsAuthorizing] = useState(false);

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
    
    const { data: platformFee, isLoading: isLoadingFee } = useReadContract({
        ...partyContract,
        functionName: 'platformFee',
        query: { enabled: !!partyContract }
    });

    // 檢查授權狀態
    const { data: isHeroAuthorized } = useReadContract({
        ...heroContract,
        functionName: 'isApprovedForAll',
        args: [address!, partyContract!.address],
        query: { enabled: !!address && !!heroContract && !!partyContract }
    });

    const { data: isRelicAuthorized } = useReadContract({
        ...relicContract,
        functionName: 'isApprovedForAll',
        args: [address!, partyContract!.address],
        query: { enabled: !!address && !!relicContract && !!partyContract }
    });

    const { availableHeroes, availableRelics } = useMemo(() => {
        if (!nfts) return { availableHeroes: [] as HeroNft[], availableRelics: [] as RelicNft[] };
        
        const heroIdsInParties = new Set(nfts.parties.flatMap(p => p.heroIds.map(id => id.toString())));
        const relicIdsInParties = new Set(nfts.parties.flatMap(p => p.relicIds.map(id => id.toString())));

        const sortHeroNfts = (nfts: HeroNft[]) => [...nfts].sort((a, b) => b.power - a.power);
        const sortRelicNfts = (nfts: RelicNft[]) => [...nfts].sort((a, b) => b.capacity - a.capacity);

        return {
            availableHeroes: sortHeroNfts(nfts.heroes.filter(h => !heroIdsInParties.has(h.id.toString()))),
            availableRelics: sortRelicNfts(nfts.relics.filter(r => !relicIdsInParties.has(r.id.toString()))),
        };
    }, [nfts]);

    const filteredNfts = useMemo(() => {
        if (!nfts) return [];
        
        switch (filter) {
            case 'hero': 
                // 英雄按戰力排序
                return [...nfts.heroes].sort((a, b) => b.power - a.power);
            case 'relic': 
                // 聖物按容量排序
                return [...nfts.relics].sort((a, b) => b.capacity - a.capacity);
            case 'party': 
                // 隊伍按稀有度排序
                return [...nfts.parties].sort((a, b) => b.partyRarity - a.partyRarity);
            case 'vip': 
                return nfts.vipCards;
            default: 
                return [];
        }
    }, [filter, nfts]);

    const handleAuthorizeHero = async () => {
        if (!heroContract || !partyContract) return;
        setIsAuthorizing(true);
        try {
            const hash = await writeContractAsync({ 
                ...heroContract, 
                functionName: 'setApprovalForAll', 
                args: [partyContract.address, true] 
            });
            addTransaction({ hash, description: '授權隊伍合約使用英雄' });
            showToast('英雄授權成功！', 'success');
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "英雄授權失敗", "error");
            }
        } finally {
            setIsAuthorizing(false);
        }
    };

    const handleAuthorizeRelic = async () => {
        if (!relicContract || !partyContract) return;
        setIsAuthorizing(true);
        try {
            const hash = await writeContractAsync({ 
                ...relicContract, 
                functionName: 'setApprovalForAll', 
                args: [partyContract.address, true] 
            });
            addTransaction({ hash, description: '授權隊伍合約使用聖物' });
            showToast('聖物授權成功！', 'success');
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "聖物授權失敗", "error");
            }
        } finally {
            setIsAuthorizing(false);
        }
    };

    const handleCreateParty = async (heroIds: bigint[], relicIds: bigint[]) => {
        if (!partyContract || !address) return;
        
        try {
            const fee = typeof platformFee === 'bigint' ? platformFee : 0n;
            const hash = await writeContractAsync({
                ...partyContract,
                functionName: 'createParty',
                args: [heroIds, relicIds],
                value: fee,
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
            
            <TeamBuilder 
                heroes={availableHeroes} 
                relics={availableRelics}
                onCreateParty={handleCreateParty}
                isCreating={isTxPending}
                platformFee={typeof platformFee === 'bigint' ? platformFee : undefined}
                isLoadingFee={isLoadingFee}
                isHeroAuthorized={isHeroAuthorized ?? false}
                isRelicAuthorized={isRelicAuthorized ?? false}
                onAuthorizeHero={handleAuthorizeHero}
                onAuthorizeRelic={handleAuthorizeRelic}
                isAuthorizing={isAuthorizing}
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
