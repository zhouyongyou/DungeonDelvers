import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '../hooks/useAppToast';
import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract } from '../config/contracts';
import { NftCard } from '../components/ui/NftCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ActionButton } from '../components/ui/ActionButton';
import type { Page } from '../types/page';
import type { AnyNft, NftType, HeroNft, RelicNft } from '../types/nft';
import { useTransactionStore } from '../stores/useTransactionStore';

interface MyAssetsPageProps {
    setActivePage: (page: Page) => void;
}

const NftFilter: React.FC<{
    currentFilter: 'all' | number;
    onFilterChange: (filter: 'all' | number) => void;
}> = ({ currentFilter, onFilterChange }) => (
    <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => onFilterChange('all')} className={`px-3 py-1 text-sm rounded-full transition ${currentFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>全部</button>
        {Array.from({ length: 5 }, (_, i) => i + 1).map(star => (
            <button key={star} onClick={() => onFilterChange(star)} className={`px-3 py-1 text-sm rounded-full transition ${currentFilter === star ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                {'★'.repeat(star)}
            </button>
        ))}
    </div>
);

const NftGrid: React.FC<{
    type: NftType;
    nfts?: AnyNft[];
    isLoading: boolean;
    onSelect?: (id: bigint, type: NftType) => void;
    selection?: Set<bigint>;
    onDisband?: (id: bigint) => void;
    setActivePage: (page: Page) => void;
}> = ({ type, nfts, isLoading, onSelect, selection, onDisband, setActivePage }) => {
    // 【修正】確保 title 物件包含所有 NftType 的可能鍵值，新增 'vip'
    const title = { hero: '英雄', relic: '聖物', party: '隊伍', vip: 'VIP卡' }[type];
    
    if (isLoading) return <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{Array.from({length:5}).map((_,i) => <SkeletonCard key={i}/>)}</div>;
    if (!nfts || nfts.length === 0) return <EmptyState message={`您尚未擁有任何${title}。`} buttonText="前往鑄造" onButtonClick={() => setActivePage('mint')} />;
    
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {nfts.map(nft => <NftCard key={`${type}-${nft.id.toString()}`} nft={nft} onSelect={onSelect} isSelected={selection?.has(nft.id)} onDisband={onDisband}/>)}
        </div>
    );
};

const MyAssetsPage: React.FC<MyAssetsPageProps> = ({ setActivePage }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const queryClient = useQueryClient();
    const { addTransaction } = useTransactionStore();
    
    const [selection, setSelection] = useState<{ heroes: Set<bigint>; relics: Set<bigint> }>({ heroes: new Set(), relics: new Set() });
    const [modal, setModal] = useState<{ type: 'create' | 'disband', isOpen: boolean, data?: any }>({ type: 'create', isOpen: false });
    const [heroFilter, setHeroFilter] = useState<'all' | number>('all');
    const [relicFilter, setRelicFilter] = useState<'all' | number>('all');

    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => {
             if (!address || !chainId) return { heroes: [], relics: [], parties: [], vipCards: [] };
             return fetchAllOwnedNfts(address, chainId);
        },
        enabled: !!address && !!chainId,
    });
    
    const heroStats = useMemo(() => {
        if (!nfts?.heroes) return { count: 0, totalPower: 0 };
        return {
            count: nfts.heroes.length,
            totalPower: nfts.heroes.reduce((sum, h) => sum + Number((h as HeroNft).power), 0)
        };
    }, [nfts?.heroes]);

    const filteredHeroes = useMemo(() => {
        if (!nfts?.heroes) return [];
        if (heroFilter === 'all') return nfts.heroes;
        return nfts.heroes.filter(h => (h as HeroNft).rarity === heroFilter);
    }, [nfts?.heroes, heroFilter]);

    const filteredRelics = useMemo(() => {
        if (!nfts?.relics) return [];
        if (relicFilter === 'all') return nfts.relics;
        return nfts.relics.filter(r => (r as RelicNft).rarity === relicFilter);
    }, [nfts?.relics, relicFilter]);
    
    const selectedHeroesPower = useMemo(() => {
      if (!nfts?.heroes || selection.heroes.size === 0) return 0;
      return Array.from(selection.heroes).reduce((total, id) => {
          const hero = nfts.heroes.find(h => (h as HeroNft).id === id) as HeroNft | undefined;
          return total + (hero ? Number(hero.power) : 0);
      }, 0);
    }, [nfts?.heroes, selection.heroes]);
    
    const partyContract = getContract(chainId, 'party');
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');

    const { data: isHeroApproved } = useReadContract({ 
        address: heroContract?.address,
        abi: heroContract?.abi,
        functionName: 'isApprovedForAll', 
        args: [address!, partyContract?.address!], 
        query: { enabled: !!address && !!partyContract?.address && !!heroContract?.address } 
    });
    const { data: isRelicApproved } = useReadContract({ 
        address: relicContract?.address,
        abi: relicContract?.abi,
        functionName: 'isApprovedForAll', 
        args: [address!, partyContract?.address!], 
        query: { enabled: !!address && !!partyContract?.address && !!relicContract?.address } 
    });
    
    const { writeContractAsync, isPending } = useWriteContract();
    
    const handleSelect = (id: bigint, type: NftType) => {
        if (type === 'hero' || type === 'relic') {
            setSelection(prev => {
                const key = type === 'hero' ? 'heroes' : 'relics';
                const newSet = new Set(prev[key]);
                if (newSet.has(id)) {
                    newSet.delete(id);
                } else {
                    newSet.add(id);
                }
                return { ...prev, [key]: newSet };
            });
        }
    };
    
    const handleCreateParty = async () => {
        if (selectedHeroesPower < 300) return showToast('隊伍總戰力未達 300！', 'error');
        if (selection.relics.size === 0) return showToast('請至少選擇一個聖物!', 'error');
        if (!partyContract) return;

        try {
            if (!isHeroApproved) {
                if(heroContract && partyContract?.address) {
                    const hash = await writeContractAsync({ address: heroContract.address, abi: heroContract.abi, functionName: 'setApprovalForAll', args: [partyContract.address, true] });
                    addTransaction({ hash, description: '授權隊伍合約使用英雄' });
                }
            }
            if (!isRelicApproved) {
                 if(relicContract && partyContract?.address) {
                    const hash = await writeContractAsync({ address: relicContract.address, abi: relicContract.abi, functionName: 'setApprovalForAll', args: [partyContract.address, true] });
                    addTransaction({ hash, description: '授權隊伍合約使用聖物' });
                 }
            }
            
            const hash = await writeContractAsync({ address: partyContract.address, abi: partyContract.abi, functionName: 'createParty', args: [Array.from(selection.heroes), Array.from(selection.relics)] });
            addTransaction({ hash, description: '創建新隊伍' });

            setSelection({ heroes: new Set(), relics: new Set() });
            setModal({ isOpen: false, type: 'create' });
            queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });

        } catch (e: any) { 
            if (!e.message.includes('User rejected the request')) {
                showToast('操作失敗，詳情請見主控台', 'error');
                console.error(e);
            }
        }
    };
    
    const handleDisbandParty = async () => {
        if (!modal.data || !partyContract) return;
        try {
            const hash = await writeContractAsync({ address: partyContract.address, abi: partyContract.abi, functionName: 'disbandParty', args: [modal.data] });
            addTransaction({ hash, description: `解散隊伍 #${modal.data}` });
            
            setModal({ isOpen: false, type: 'disband' });
            queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
        } catch (e: any) { 
            if (!e.message.includes('User rejected the request')) {
                showToast('操作失敗，詳情請見主控台', 'error');
                console.error(e);
            }
        }
    };

    return (
        <section>
            <h2 className="page-title">隊伍</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div><h3 className="section-title">我的隊伍 NFT</h3><NftGrid type="party" nfts={nfts?.parties} isLoading={isLoadingNfts} onDisband={(id) => setModal({ isOpen: true, type: 'disband', data: id })} setActivePage={setActivePage}/></div><hr/>
                    
                    <div>
                        <h3 className="section-title">我的英雄</h3>
                        <div className="card-bg p-4 rounded-xl mb-4">
                            <div className="flex justify-around text-center mb-4">
                                <div><p className="text-sm text-gray-500">總數量</p><p className="text-xl font-bold">{heroStats.count}</p></div>
                                <div><p className="text-sm text-gray-500">總戰力</p><p className="text-xl font-bold">{heroStats.totalPower}</p></div>
                            </div>
                            <NftFilter currentFilter={heroFilter} onFilterChange={setHeroFilter} />
                        </div>
                        <NftGrid type="hero" nfts={filteredHeroes} isLoading={isLoadingNfts} onSelect={handleSelect} selection={selection.heroes} setActivePage={setActivePage}/>
                    </div>

                    <div>
                        <h3 className="section-title">我的聖物</h3>
                        <div className="card-bg p-4 rounded-xl mb-4">
                            <div className="flex justify-around text-center mb-4">
                                <div><p className="text-sm text-gray-500">總數量</p><p className="text-xl font-bold">{nfts?.relics?.length ?? 0}</p></div>
                            </div>
                             <NftFilter currentFilter={relicFilter} onFilterChange={setRelicFilter} />
                        </div>
                        <NftGrid type="relic" nfts={filteredRelics} isLoading={isLoadingNfts} onSelect={handleSelect} selection={selection.relics} setActivePage={setActivePage}/>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <div className="card-bg p-6 rounded-xl shadow-lg sticky top-24">
                        <h3 className="section-title">隊伍配置</h3>
                        <div className="space-y-4 min-h-[100px] text-sm">
                             <div><h4 className="font-bold">英雄:</h4>{selection.heroes.size > 0 ? Array.from(selection.heroes).map(id => <p key={id.toString()} className="ml-2">- 英雄 #{id.toString()}</p>) : <p className="ml-2 text-gray-500 dark:text-gray-400">點擊左側列表選擇</p>}</div>
                             <div><h4 className="font-bold">聖物:</h4>{selection.relics.size > 0 ? Array.from(selection.relics).map(id => <p key={id.toString()} className="ml-2">- 聖物 #{id.toString()}</p>) : <p className="ml-2 text-gray-500 dark:text-gray-400">點擊左側列表選擇</p>}</div>
                             <div><h4 className="font-bold">總戰力:</h4><p className="ml-2 text-indigo-600 font-bold">{selectedHeroesPower} MP</p></div>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                           <ActionButton onClick={() => setModal({ isOpen: true, type: 'create' })} className="w-full py-2 rounded-lg" isLoading={isPending} disabled={isPending}>創建隊伍</ActionButton>
                           <p className="text-xs text-gray-500 mt-1">首次創建需授權NFT (戰力需 {'>'} 300)</p>
                        </div>
                    </div>
                </div>
            </div>
            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.type === 'create' ? "確認創建隊伍" : "確認解散隊伍"}
                onConfirm={modal.type === 'create' ? handleCreateParty : handleDisbandParty}
                confirmText={modal.type === 'create' ? "創建" : "解散"}
                isConfirming={isPending}
            >
                {modal.type === 'create' && <div><p>您確定要用以下資產創建一個新的隊伍嗎？</p><p className="mt-2"><b>英雄:</b> {Array.from(selection.heroes).join(', ') || '無'}</p><p><b>聖物:</b> {Array.from(selection.relics).join(', ') || '無'}</p></div>}
                {modal.type === 'disband' && <p>您確定要解散隊伍 #{modal.data?.toString()} 嗎？此隊伍 NFT 將被銷毀，其中的英雄和聖物將會歸還到您的錢包。</p>}
            </Modal>
        </section>
    );
};

export default MyAssetsPage;
