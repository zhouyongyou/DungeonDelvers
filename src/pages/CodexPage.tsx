// src/pages/CodexPage.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { fetchAllOwnedNfts } from '../api/nfts';
import { NftCard } from '../components/ui/NftCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import type { AnyNft, HeroNft, RelicNft, NftAttribute } from '../types/nft';

// 模擬從 api 資料夾讀取所有可能的 NFT
const fetchAllPossibleNfts = async (): Promise<{ heroes: HeroNft[], relics: RelicNft[] }> => {
    const heroIds = [1, 2, 3, 4, 5];
    const relicIds = [1, 2, 3, 4, 5];

    const heroPromises = heroIds.map(id => 
        fetch(`/api/hero/${id}.json`).then(res => res.json())
    );
    const relicPromises = relicIds.map(id => 
        fetch(`/api/relic/${id}.json`).then(res => res.json())
    );

    const heroData = await Promise.all(heroPromises);
    const relicData = await Promise.all(relicPromises);

    const findAttr = (attributes: NftAttribute[], trait: string, defaultValue: any = 0) => 
        attributes?.find(a => a.trait_type === trait)?.value ?? defaultValue;

    const heroes = heroData.map((meta, i) => ({
        ...meta,
        id: BigInt(heroIds[i]),
        type: 'hero',
        contractAddress: '0x', // 地址在此不重要
        power: Number(findAttr(meta.attributes, 'Power')),
        rarity: Number(findAttr(meta.attributes, 'Rarity', 1)), // 假設稀有度是數字
    })) as HeroNft[];

    const relics = relicData.map((meta, i) => ({
        ...meta,
        id: BigInt(relicIds[i]),
        type: 'relic',
        contractAddress: '0x', // 地址在此不重要
        capacity: Number(findAttr(meta.attributes, 'Capacity')),
        rarity: Number(findAttr(meta.attributes, 'Rarity', 1)),
    })) as RelicNft[];

    return { heroes, relics };
};


const CodexPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const [filter, setFilter] = useState<'hero' | 'relic'>('hero');

    // 獲取所有可能的 NFT
    const { data: allPossibleNfts, isLoading: isLoadingAll } = useQuery({
        queryKey: ['allPossibleNfts'],
        queryFn: fetchAllPossibleNfts,
    });

    // 獲取玩家擁有的 NFT
    const { data: ownedNfts, isLoading: isLoadingOwned } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId!),
        enabled: !!address && !!chainId,
    });

    const ownedHeroIds = useMemo(() => new Set(ownedNfts?.heroes.map(h => h.name)), [ownedNfts]);
    const ownedRelicIds = useMemo(() => new Set(ownedNfts?.relics.map(r => r.name)), [ownedNfts]);

    const displayNfts = useMemo(() => {
        if (!allPossibleNfts) return [];
        return filter === 'hero' ? allPossibleNfts.heroes : allPossibleNfts.relics;
    }, [allPossibleNfts, filter]);

    const getIsUnlocked = (nft: AnyNft) => {
        if (!ownedNfts) return false;
        if (nft.type === 'hero') return ownedHeroIds.has(nft.name);
        if (nft.type === 'relic') return ownedRelicIds.has(nft.name);
        return false;
    };

    const isLoading = isLoadingAll || (!!address && isLoadingOwned);

    return (
        <section>
            <h2 className="page-title">冒險者圖鑑</h2>
            <p className="text-center text-gray-400 max-w-2xl mx-auto -mt-4 mb-8">
                探索埃索斯大陸上所有傳說中的英雄與聖物。點亮您已擁有的收藏！
            </p>

            <div className="flex justify-center mb-6">
                <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg">
                    <button onClick={() => setFilter('hero')} className={`px-6 py-2 text-sm font-medium rounded-md transition ${filter === 'hero' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                        英雄圖鑑
                    </button>
                    <button onClick={() => setFilter('relic')} className={`px-6 py-2 text-sm font-medium rounded-md transition ${filter === 'relic' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                        聖物圖鑑
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : displayNfts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {displayNfts.map((nft, index) => {
                        const isUnlocked = getIsUnlocked(nft);
                        return (
                            <div key={index} className={`transition-all duration-500 ${isUnlocked ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                <div className="relative">
                                    <NftCard nft={nft} />
                                    {!isUnlocked && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                                            <span className="font-bold text-gray-300 text-lg">未解鎖</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyState message="無法載入圖鑑資料。" />
            )}
        </section>
    );
};

export default CodexPage;
