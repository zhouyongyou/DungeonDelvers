// src/pages/CodexPage.tsx (重構：整合英雄、聖物、VIP)

import React, { useMemo } from 'react';
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
    queryFn: async (): Promise<{ heroes: HeroNft[], relics: RelicNft[] }> => {
        const rarities = [1, 2, 3, 4, 5];
        const heroes: HeroNft[] = [];
        const relics: RelicNft[] = [];
        const getPowerByRarity = (r: number) => [0, 32, 75, 125, 175, 227][r] || 0;
        const getCapacityByRarity = (r: number) => [0, 1, 2, 3, 4, 5][r] || 0;
        const rarityNames = ["", "Common", "Uncommon", "Rare", "Epic", "Legendary"];

        // 生成英雄和聖物
        for (const r of rarities) {
            const heroPower = getPowerByRarity(r);
            const relicCapacity = getCapacityByRarity(r);
            heroes.push({ 
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
        
        return { heroes, relics };
    },
    staleTime: Infinity, // 這些數據是靜態的，不需要重新獲取
});

// ★ 核心改造：新的 Hook，獲取已解鎖的稀有度
const useOwnedCodexIdentifiers = () => {
    const { address, chainId } = useAccount();
    const { data, isLoading } = useQuery<{ ownedHeroRarities: Set<number>, ownedRelicRarities: Set<number> }>({
        queryKey: ['ownedCodexIdentifiers', address, chainId],
        queryFn: async () => {
            if (!address || !import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL) {
                return { ownedHeroRarities: new Set(), ownedRelicRarities: new Set() };
            }
            
            const response = await fetch(import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        query GetOwnedRarities($owner: ID!) {
                            player(id: $owner) {
                                id
                                heros {
                                    id
                                    rarity
                                }
                                relics {
                                    id
                                    rarity
                                }
                            }
                        }
                    `,
                    variables: { owner: address.toLowerCase() }
                }),
            });
            
            if (!response.ok) throw new Error('GraphQL Network response was not ok');
            const json = await response.json();
            
            // 檢查是否有錯誤
            if (json.errors) {
                console.error('GraphQL 錯誤:', json.errors);
                return { ownedHeroRarities: new Set(), ownedRelicRarities: new Set() };
            }
            
            const data = json?.data;
            const heroes = data?.player?.heros || [];
            const relics = data?.player?.relics || [];
            
            const ownedHeroRarities = new Set<number>(
                heroes.map((h: { rarity: number }) => Number(h.rarity)).filter((r: number) => !isNaN(r))
            );
            const ownedRelicRarities = new Set<number>(
                relics.map((r: { rarity: number }) => Number(r.rarity)).filter((r: number) => !isNaN(r))
            );
            
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
    const { data: allPossibleNfts, isLoading: isLoadingAll } = useAllPossibleNfts();
    const { identifiers, isLoadingIdentifiers } = useOwnedCodexIdentifiers();

    const getIsUnlocked = (nft: AnyNft) => {
        if (!identifiers) return false;
        
        if (nft.type === 'hero') {
            const rarity = typeof nft.rarity === 'number' ? nft.rarity : Number(nft.rarity);
            return identifiers.ownedHeroRarities.has(rarity);
        }
        
        if (nft.type === 'relic') {
            const rarity = typeof nft.rarity === 'number' ? nft.rarity : Number(nft.rarity);
            return identifiers.ownedRelicRarities.has(rarity);
        }
        
        return false;
    };

    const isLoading = isLoadingAll || isLoadingIdentifiers;

    return (
        <section>
            <h2 className="page-title">冒險者圖鑑</h2>
            <p className="text-center text-gray-400 max-w-2xl mx-auto -mt-4 mb-6">探索埃索斯大陸上所有傳說中的英雄與聖物。點亮您已解鎖的收藏！</p>
            <div className="text-center mb-8">
                <a href="#/mint"><ActionButton className="px-8 py-3 text-lg">前往鑄造英雄/聖物</ActionButton></a>
            </div>

            {/* 圖鑑說明 */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">📖</span>
                    <span className="text-sm font-medium text-blue-300">圖鑑說明</span>
                </div>
                <ul className="text-xs text-gray-400 space-y-1">
                    <li>• <strong className="text-blue-300">已解鎖</strong>：擁有該稀有度的 NFT 後即可在圖鑑中查看</li>
                    <li>• <strong className="text-red-400">⚠️ 重要提醒</strong>：當英雄或聖物組成隊伍後，該稀有度在圖鑑中會暫時顯示為未解鎖狀態，直到解散隊伍</li>
                    <li>• <strong className="text-purple-300">戰力範圍</strong>：英雄顯示該稀有度的戰力範圍值，實際戰力可能有所不同</li>
                    <li>• <strong className="text-green-300">數據同步</strong>：新鑄造或組隊的變更需要 2-3 分鐘才會在圖鑑中更新</li>
                </ul>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
            ) : allPossibleNfts ? (
                <div className="space-y-12">
                    {/* 英雄圖鑑區 */}
                    <div>
                        <h3 className="text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-3">
                            <span>🦸</span>
                            <span>英雄圖鑑</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {allPossibleNfts.heroes.map((nft, index) => {
                                const isUnlocked = getIsUnlocked(nft);
                                return (
                                    <div key={`hero-${index}`} className={`transition-all duration-500 ${isUnlocked ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                        <div className="relative">
                                            <NftCard nft={nft} isCodex={true} />
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
                    </div>

                    {/* 聖物圖鑑區 */}
                    <div>
                        <h3 className="text-2xl font-bold text-purple-400 mb-6 flex items-center gap-3">
                            <span>💎</span>
                            <span>聖物圖鑑</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {allPossibleNfts.relics.map((nft, index) => {
                                const isUnlocked = getIsUnlocked(nft);
                                return (
                                    <div key={`relic-${index}`} className={`transition-all duration-500 ${isUnlocked ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                        <div className="relative">
                                            <NftCard nft={nft} isCodex={true} />
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
                    </div>

                </div>
            ) : (
                <EmptyState message="無法載入圖鑑資料。" />
            )}
        </section>
    );
};

export default CodexPage;
