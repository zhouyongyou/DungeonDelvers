// src/pages/CodexPage.tsx (The Graph 改造版)

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
// 不再需要從 nfts.ts 獲取所有 NFT
// import { fetchAllOwnedNfts } from '../api/nfts';
import { NftCard } from '../components/ui/NftCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import type { AnyNft, HeroNft, RelicNft } from '../types/nft';
import { Buffer } from 'buffer';
import { ActionButton } from '../components/ui/ActionButton';
import { bsc } from 'wagmi/chains';

// =================================================================
// Section: 靜態 SVG 產生器與 GraphQL 查詢
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

// ★ 核心改造：一個極度輕量的查詢，只獲取擁有的稀有度
const GET_OWNED_RARITIES_QUERY = `
  query GetOwnedRarities($owner: ID!) {
    player(id: $owner) {
      heroes(first: 1000) { # 假設玩家不會擁有超過1000種不同稀有度的英雄
        rarity
      }
      relics(first: 1000) {
        rarity
      }
    }
  }
`;

// SvgGenerator 保持不變，用於在前端顯示所有可能的 NFT 樣式
const SvgGenerator = {
    _getSVGHeader: () => `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">`,
    _getGlobalStyles: () => `<style>.base{font-family: 'Georgia', serif; fill: #e0e0e0;}.title{font-size: 20px; font-weight: bold;}.subtitle{font-size: 14px; opacity: 0.7;}.stat-label{font-size: 12px; font-weight: bold; text-transform: uppercase; opacity: 0.6;}.stat-value{font-size: 16px; font-weight: bold;}.main-stat-value{font-size: 42px; font-weight: bold;}.footer-text{font-size: 12px; opacity: 0.5;}</style>`,
    _getGradientDefs: (c1: string, c2: string) => `<defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>`,
    _getBackgroundPattern: (color: string) => `<rect width="400" height="400" fill="#111"/><g opacity="0.1"><path d="M10 0 L0 10 M20 0 L0 20 M30 0 L0 30" stroke="${color}" stroke-width="1"/><path d="M-10 400 L410 400" stroke="${color}" stroke-width="2"/></g>`,
    _getBorder: (rarity: number) => `<rect x="4" y="4" width="392" height="392" rx="15" fill="transparent" stroke="${SvgGenerator._getRarityColor(rarity)}" stroke-width="2" stroke-opacity="0.8"/>`,
    _getHeader: (title: string, subtitle: string, tokenId: bigint) => `<text x="20" y="38" class="base title">${title}<tspan class="subtitle">${subtitle}</tspan></text><text x="380" y="38" class="base subtitle" text-anchor="end">#${tokenId.toString()}</text>`,
    _getCentralImage: (emoji: string) => `<rect x="50" y="65" width="300" height="150" rx="10" fill="rgba(0,0,0,0.2)"/><text x="50%" y="140" font-size="90" text-anchor="middle" dominant-baseline="middle">${emoji}</text>`,
    _getPrimaryStat: (label: string, value: string) => `<text x="50%" y="245" class="base stat-label" text-anchor="middle">${label}</text><text x="50%" y="280" class="base main-stat-value" text-anchor="middle" fill="url(#grad)">${value}</text>`,
    _getSecondaryStats: (label1: string, value1: string, label2: string, value2: string) => `<line x1="20" y1="320" x2="380" y2="320" stroke="#444" stroke-width="1"/><g text-anchor="middle"><text x="120" y="345" class="base stat-label">${label1}</text><text x="120" y="365" class="base stat-value">${value1}</text><text x="280" y="345" class="base stat-label">${label2}</text><text x="280" y="365" class="base stat-value">${value2}</text></g>`,
    _getFooter: (text: string) => `<text x="50%" y="390" class="base footer-text" text-anchor="middle">${text}</text>`,
    _getHeroStyles: () => ["#B71C1C", "#F44336"],
    _getRelicStyles: () => ["#1A237E", "#3F51B5"],
    _getRarityColor: (rarity: number) => {
        if (rarity === 5) return "#E040FB"; if (rarity === 4) return "#00B0FF";
        if (rarity === 3) return "#FFD600"; if (rarity === 2) return "#CFD8DC";
        return "#D7CCC8";
    },
    _getRarityStars: (rarity: number) => {
        let stars = ''; const color = SvgGenerator._getRarityColor(rarity);
        for (let i = 0; i < 5; i++) { stars += `<tspan fill="${color}" fill-opacity="${i < rarity ? '1' : '0.2'}">★</tspan>`; }
        return stars;
    },
    generateHeroSVG: (data: { rarity: number, power: number }, tokenId: bigint) => {
        const [primaryColor, accentColor] = SvgGenerator._getHeroStyles();
        const svgString = [ SvgGenerator._getSVGHeader(), SvgGenerator._getGlobalStyles(), SvgGenerator._getGradientDefs(primaryColor, accentColor), SvgGenerator._getBackgroundPattern(primaryColor), SvgGenerator._getBorder(data.rarity), SvgGenerator._getHeader("Hero", "", tokenId), SvgGenerator._getCentralImage("⚔️"), SvgGenerator._getPrimaryStat("POWER", data.power.toString()), SvgGenerator._getSecondaryStats("RARITY", SvgGenerator._getRarityStars(data.rarity), "", ""), SvgGenerator._getFooter("Dungeon Delvers"), '</svg>' ].join('');
        return `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;
    },
    generateRelicSVG: (data: { rarity: number, capacity: number }, tokenId: bigint) => {
        const [primaryColor, accentColor] = SvgGenerator._getRelicStyles();
        const svgString = [ SvgGenerator._getSVGHeader(), SvgGenerator._getGlobalStyles(), SvgGenerator._getGradientDefs(primaryColor, accentColor), SvgGenerator._getBackgroundPattern(primaryColor), SvgGenerator._getBorder(data.rarity), SvgGenerator._getHeader("Relic", "", tokenId), SvgGenerator._getCentralImage("💎"), SvgGenerator._getPrimaryStat("CAPACITY", data.capacity.toString()), SvgGenerator._getSecondaryStats("RARITY", SvgGenerator._getRarityStars(data.rarity), "", ""), SvgGenerator._getFooter("Ancient Artifact"), '</svg>' ].join('');
        return `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;
    }
};

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
        const rarityNames = ["", "Common", "Uncommon", "Rare", "Epic", "Legendary"];

        for (const r of rarities) {
            const heroPower = getPowerByRarity(r);
            heroes.push({ id: BigInt(r), name: `${rarityNames[r]} Hero`, description: ``, image: SvgGenerator.generateHeroSVG({ rarity: r, power: heroPower }, BigInt(r)), attributes: [], type: 'hero', contractAddress: '0x0', power: heroPower, rarity: r });
            relics.push({ id: BigInt(r), name: `${rarityNames[r]} Relic`, description: ``, image: SvgGenerator.generateRelicSVG({ rarity: r, capacity: r }, BigInt(r)), attributes: [], type: 'relic', contractAddress: '0x0', capacity: r, rarity: r });
        }
        return { heroes, relics };
    },
    staleTime: Infinity, // 這些數據是靜態的，不需要重新獲取
});

// ★ 核心改造：新的 Hook，只獲取已解鎖的稀有度
const useOwnedCodexIdentifiers = () => {
    const { address, chainId } = useAccount();
    const { data, isLoading } = useQuery<{ ownedHeroRarities: Set<number>, ownedRelicRarities: Set<number> }>({
        queryKey: ['ownedCodexIdentifiers', address, chainId],
        queryFn: async () => {
            if (!address || !THE_GRAPH_API_URL) return { ownedHeroRarities: new Set(), ownedRelicRarities: new Set() };
            const response = await fetch(THE_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: GET_OWNED_RARITIES_QUERY, variables: { owner: address.toLowerCase() } }),
            });
            if (!response.ok) throw new Error('GraphQL Network response was not ok');
            const { data } = await response.json();
            const ownedHeroRarities = new Set<number>(data?.player?.heroes?.map((h: { rarity: number }) => h.rarity) ?? []);
            const ownedRelicRarities = new Set<number>(data?.player?.relics?.map((r: { rarity: number }) => r.rarity) ?? []);
            return { ownedHeroRarities, ownedRelicRarities };
        },
        enabled: !!address && chainId === bsc.id,
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
        return filter === 'hero' ? allPossibleNfts.heroes : allPossibleNfts.relics;
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
