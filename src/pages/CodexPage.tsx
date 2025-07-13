// src/pages/CodexPage.tsx (重構：移除 SVG 生成，統一用圖片)

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { NftCard } from '../components/ui/NftCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import type { AnyNft, HeroNft, RelicNft } from '../types/nft';
import { ActionButton } from '../components/ui/ActionButton';
import { bsc } from 'wagmi/chains';

// =================================================================
// Section: 數據獲取 Hooks
// =================================================================

// 這個 Hook 用於獲取所有可能的 NFT 種類，用於展示，它只在客戶端運行一次。
const useAllPossibleNfts = () => useQuery({
    queryKey: ['allPossibleNfts'],
    queryFn: async (): Promise<{ heros: HeroNft[], relics: RelicNft[] }> => {
        const rarities = [1, 2, 3, 4, 5];
        const heros: HeroNft[] = [];
        const relics: RelicNft[] = [];
        const getPowerByRarity = (r: number) => [0, 32, 75, 125, 175, 227][r] || 0;
        const getCapacityByRarity = (r: number) => [0, 1, 2, 3, 4, 5][r] || 0;
        const rarityNames = ["", "Common", "Uncommon", "Rare", "Epic", "Legendary"];

        for (const r of rarities) {
            const heroPower = getPowerByRarity(r);
            const relicCapacity = getCapacityByRarity(r);
            heros.push({ 
                id: BigInt(r), 
                name: `${rarityNames[r]} Hero`, 
                description: `${rarityNames[r]} 英雄，戰力 ${heroPower}`,
                image: `/images/hero/hero-${r}.png`,
                attributes: [
                    { trait_type: 'Rarity', value: rarityNames[r] },
                    { trait_type: 'Power', value: heroPower.toString() }
                ], 
                type: 'hero', 
                contractAddress: '0x0', 
                power: heroPower, 
                rarity: r,
                source: 'fallback' as const,
            });
            relics.push({ 
                id: BigInt(r), 
                name: `${rarityNames[r]} Relic`, 
                description: `${rarityNames[r]} 聖物，容量 ${relicCapacity}`,
                image: `/images/relic/relic-${r}.png`,
                attributes: [
                    { trait_type: 'Rarity', value: rarityNames[r] },
                    { trait_type: 'Capacity', value: relicCapacity.toString() }
                ], 
                type: 'relic', 
                contractAddress: '0x0', 
                capacity: relicCapacity, 
                rarity: r,
                source: 'fallback' as const,
            });
        }
        return { heros, relics };
    },
    staleTime: Infinity, // 這些數據是靜態的，不需要重新獲取
});

// ★ 核心改造：新的 Hook，只獲取已解鎖的稀有度
const useOwnedCodexIdentifiers = () => {
    const { address, chainId } = useAccount();
    const { data, isLoading } = useQuery<{ ownedHeroRarities: Set<number>, ownedRelicRarities: Set<number> }>({
        queryKey: ['ownedCodexIdentifiers', address, chainId],
        queryFn: async () => {
            if (!address || !import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL) return { ownedHeroRarities: new Set(), ownedRelicRarities: new Set() };
            const response = await fetch(import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL, {
                // Fix: Import the missing GraphQL query and handle possible missing data
                // Import at the top of the file (outside this selection):
                // import { GET_OWNED_RARITIES_QUERY } from '../graphql/queries';

                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        query GetOwnedRarities($owner: String!) {
                            player(id: $owner) {
                                heros { rarity }
                                relics { rarity }
                            }
                        }
                    `,
                    variables: { owner: address.toLowerCase() }
                }),
            });
            if (!response.ok) throw new Error('GraphQL Network response was not ok');
            const json = await response.json();
            const data = json?.data;
            const ownedHeroRarities = new Set<number>(
                data?.player?.heros?.map((h: { rarity: number }) => h.rarity) ?? []
            );
            const ownedRelicRarities = new Set<number>(data?.player?.relics?.map((r: { rarity: number }) => r.rarity) ?? []);
            return { ownedHeroRarities, ownedRelicRarities };
        },
        enabled: !!address && chainId === bsc.id,
        // ★★★ 網路優化：增加 staleTime，避免不必要的重複請求 ★★★
        staleTime: 1000 * 60, // 60 秒
    });
    return { identifiers: data, isLoadingIdentifiers: isLoading };
};

// =================================================================
// Section: 主頁面元件
// =================================================================

const CodexPage: React.FC = () => {
    const [filter, setFilter] = useState<'hero' | 'relic'>('hero');
    const { data: allPossibleNfts, isLoading: isLoadingAll } = useAllPossibleNfts();
    const { identifiers, isLoadingIdentifiers } = useOwnedCodexIdentifiers();

    const displayNfts = useMemo(() => {
        if (!allPossibleNfts) return [];
        return filter === 'hero' ? allPossibleNfts.heros : allPossibleNfts.relics;
    }, [allPossibleNfts, filter]);

    const getIsUnlocked = (nft: AnyNft) => {
        if (!identifiers) return false;
        if (nft.type === 'hero') return identifiers.ownedHeroRarities.has(nft.rarity);
        if (nft.type === 'relic') return identifiers.ownedRelicRarities.has(nft.rarity);
        return false;
    };

    const isLoading = isLoadingAll || isLoadingIdentifiers;

    return (
        <section>
            <h2 className="page-title">冒險者圖鑑</h2>
            <p className="text-center text-gray-400 max-w-2xl mx-auto -mt-4 mb-6">探索埃索斯大陸上所有傳說中的英雄與聖物。點亮您已擁有的收藏！</p>
            <div className="text-center mb-8"><a href="#/mint"><ActionButton className="px-8 py-3 text-lg">前往鑄造英雄/聖物</ActionButton></a></div>

            <div className="flex justify-center mb-6">
                <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg">
                    <button onClick={() => setFilter('hero')} className={`px-6 py-2 text-sm font-medium rounded-md transition ${filter === 'hero' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>英雄圖鑑</button>
                    <button onClick={() => setFilter('relic')} className={`px-6 py-2 text-sm font-medium rounded-md transition ${filter === 'relic' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>聖物圖鑑</button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : displayNfts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {displayNfts.map((nft: unknown, index: number) =>  {
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
