// src/components/mint/FeaturedNftsGallery.tsx
// 鑄造頁面的精選NFT展示區域

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { LazyImage } from '../ui/LazyImage';
import { THE_GRAPH_API_URL } from '../../config/graphConfig';
import { graphQLRateLimiter } from '../../utils/rateLimiter';
import { logger } from '../../utils/logger';

// GraphQL 查詢 - 獲取精選的高稀有度NFT
const GET_FEATURED_NFTS_QUERY = `
  query GetFeaturedNfts {
    featuredHeroes: heros(
      where: { rarity_gte: 3 }
      orderBy: power
      orderDirection: desc
      first: 6
    ) {
      id
      tokenId
      power
      element
      class
      rarity
      owner {
        id
      }
    }
    
    featuredRelics: relics(
      where: { rarity_gte: 3 }
      orderBy: capacity
      orderDirection: desc
      first: 4
    ) {
      id
      tokenId
      capacity
      category
      rarity
      owner {
        id
      }
    }
  }
`;

const fetchFromGraph = async (query: string, variables = {}) => {
  try {
    return await graphQLRateLimiter.execute(async () => {
      const response = await fetch(THE_GRAPH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      
      const data = await response.json();
      if (data.errors) {
        logger.error('GraphQL query failed:', data.errors);
        return null;
      }
      return data.data;
    });
  } catch (error) {
    logger.error('Failed to fetch featured NFTs:', error);
    return null;
  }
};

const RARITY_COLORS: Record<number, string> = {
  1: 'border-gray-500',
  2: 'border-green-500',
  3: 'border-blue-500',
  4: 'border-purple-500',
  5: 'border-orange-500',
};

const RARITY_LABELS: Record<number, string> = {
  1: '普通',
  2: '罕見',
  3: '稀有',
  4: '史詩',
  5: '傳說',
};

const ELEMENT_LABELS: Record<string, string> = {
  fire: '火',
  water: '水',
  earth: '土',
  metal: '金',
  wood: '木'
};

const CLASS_LABELS: Record<string, string> = {
  warrior: '戰士',
  mage: '法師',
  archer: '弓手',
  priest: '牧師'
};

const RELIC_CATEGORY_LABELS: Record<string, string> = {
  weapon: '武器',
  armor: '護甲',
  accessory: '飾品',
  consumable: '消耗品'
};

// 備用的樣本NFT數據（每個稀有度一個，根據白皮書戰力範圍）
const SAMPLE_NFTS = {
  heroes: [
    { id: '1', tokenId: '1001', power: 230, element: 'fire', class: 'warrior', rarity: 5 },  // 傳說: 200-255
    { id: '2', tokenId: '1002', power: 175, element: 'water', class: 'mage', rarity: 4 },    // 史詩: 150-200
    { id: '3', tokenId: '1003', power: 125, element: 'earth', class: 'archer', rarity: 3 },  // 稀有: 100-150
    { id: '4', tokenId: '1004', power: 75, element: 'metal', class: 'priest', rarity: 2 },   // 罕見: 50-100
    { id: '5', tokenId: '1005', power: 35, element: 'wood', class: 'warrior', rarity: 1 },   // 普通: 15-50
  ],
  relics: [
    { id: '1', tokenId: '2001', capacity: 5, category: 'weapon', rarity: 5 },
    { id: '2', tokenId: '2002', capacity: 4, category: 'armor', rarity: 4 },
    { id: '3', tokenId: '2003', capacity: 3, category: 'accessory', rarity: 3 },
    { id: '4', tokenId: '2004', capacity: 2, category: 'weapon', rarity: 2 },
    { id: '5', tokenId: '2005', capacity: 1, category: 'armor', rarity: 1 },
  ]
};

interface NftCardProps {
  nft: any;
  type: 'hero' | 'relic';
}

const NftCard: React.FC<NftCardProps> = ({ nft, type }) => {
  const [imageError, setImageError] = useState(false);
  
  // 生成NFT圖片URL
  const getImageUrl = () => {
    if (imageError) {
      // 使用SVG生成器作為後備
      return type === 'hero' 
        ? `data:image/svg+xml,${encodeURIComponent(generateHeroSVG(nft))}`
        : `data:image/svg+xml,${encodeURIComponent(generateRelicSVG(nft))}`;
    }
    
    // 嘗試使用PNG圖片
    return type === 'hero'
      ? `https://dungeondelvers.xyz/images/hero/hero-${nft.rarity}.png`
      : `https://dungeondelvers.xyz/images/relic/relic-${nft.rarity}.png`;
  };

  // 簡化的SVG生成函數
  const generateHeroSVG = (hero: any) => {
    const colors = {
      fire: '#ef4444',
      water: '#3b82f6', 
      earth: '#a3a3a3',
      metal: '#fbbf24',
      wood: '#22c55e'
    };
    
    return `
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:${colors[hero.element as keyof typeof colors]};stop-opacity:0.3"/>
            <stop offset="100%" style="stop-color:#000000;stop-opacity:0.8"/>
          </radialGradient>
        </defs>
        <rect width="400" height="400" fill="url(#bg)"/>
        <circle cx="200" cy="180" r="60" fill="${colors[hero.element as keyof typeof colors]}" opacity="0.8"/>
        <text x="200" y="330" text-anchor="middle" fill="#fbbf24" font-size="18" font-family="Arial">
          ⚔️ ${hero.power}
        </text>
        <text x="200" y="360" text-anchor="middle" fill="#a855f7" font-size="14" font-family="Arial">
          ${RARITY_LABELS[hero.rarity]} (${hero.rarity}★)
        </text>
      </svg>
    `;
  };

  const generateRelicSVG = (relic: any) => {
    const colors = {
      weapon: '#ef4444',
      armor: '#3b82f6',
      accessory: '#a855f7',
      consumable: '#22c55e'
    };
    
    return `
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:${colors[relic.category as keyof typeof colors]};stop-opacity:0.3"/>
            <stop offset="100%" style="stop-color:#000000;stop-opacity:0.8"/>
          </radialGradient>
        </defs>
        <rect width="400" height="400" fill="url(#bg)"/>
        <rect x="150" y="150" width="100" height="100" fill="${colors[relic.category as keyof typeof colors]}" opacity="0.8" rx="10"/>
        <text x="200" y="330" text-anchor="middle" fill="#3b82f6" font-size="18" font-family="Arial">
          📦 ${relic.capacity}
        </text>
        <text x="200" y="360" text-anchor="middle" fill="#a855f7" font-size="14" font-family="Arial">
          ${RARITY_LABELS[relic.rarity]} (${relic.rarity}★)
        </text>
      </svg>
    `;
  };

  return (
    <div className={`relative bg-gray-800/50 rounded-lg p-3 border-2 ${RARITY_COLORS[nft.rarity]} hover:scale-105 transition-all duration-300 group`}>
      <div className="aspect-square rounded-lg overflow-hidden mb-3">
        <LazyImage
          src={getImageUrl()}
          alt={`${type} #${nft.tokenId}`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
      
      <div className="text-center space-y-1">
        {type === 'hero' ? (
          <div className="space-y-1">
            <div className="text-xs text-orange-400">
              ⚔️ {nft.power}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-xs text-blue-400">
              📦 {nft.capacity}
            </div>
          </div>
        )}
        
        <div className={`text-xs font-bold ${RARITY_COLORS[nft.rarity].replace('border-', 'text-')}`}>
          {RARITY_LABELS[nft.rarity]} ({nft.rarity}★)
        </div>
      </div>
      
      {/* Hover效果 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
    </div>
  );
};

export const FeaturedNftsGallery: React.FC = () => {
  const [showAll, setShowAll] = useState(false);

  const { data: featuredData, isLoading } = useQuery({
    queryKey: ['featuredNfts'],
    queryFn: () => fetchFromGraph(GET_FEATURED_NFTS_QUERY),
    staleTime: 300000, // 5分鐘緩存
    retry: 1, // 只重試一次
  });

  // 使用真實數據或樣本數據，並按稀有度排序
  let heroes = featuredData?.featuredHeroes || SAMPLE_NFTS.heroes;
  let relics = featuredData?.featuredRelics || SAMPLE_NFTS.relics;
  
  // 如果是樣本數據，直接使用（已經按稀有度排序）
  // 如果是真實數據，去重並每個稀有度只取一個
  if (featuredData?.featuredHeroes) {
    const heroMap = new Map<number, any>();
    heroes.forEach((hero: any) => {
      if (!heroMap.has(hero.rarity)) {
        heroMap.set(hero.rarity, hero);
      }
    });
    heroes = Array.from(heroMap.values()).sort((a, b) => b.rarity - a.rarity);
  }
  
  if (featuredData?.featuredRelics) {
    const relicMap = new Map<number, any>();
    relics.forEach((relic: any) => {
      if (!relicMap.has(relic.rarity)) {
        relicMap.set(relic.rarity, relic);
      }
    });
    relics = Array.from(relicMap.values()).sort((a, b) => b.rarity - a.rarity);
  }
  
  const displayHeroes = heroes;
  const displayRelics = relics;

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-400 mt-4">載入精選NFT中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="text-center space-y-4">
        <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          🌟 精選NFT展示
        </h3>
        <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto px-4">
          探索其他玩家鑄造的傑作，這些高稀有度的NFT展現了遊戲的藝術美感與強大力量
        </p>
      </div>

      {/* Heroes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white flex items-center">
            🦸 傳奇英雄
          </h4>
          <span className="text-sm text-gray-400">
            各稀有度精選展示
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {displayHeroes.map((hero) => (
            <NftCard key={hero.id} nft={hero} type="hero" />
          ))}
        </div>
      </div>

      {/* Relics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white flex items-center">
            🔮 神秘聖物
          </h4>
          <span className="text-sm text-gray-400">
            各稀有度精選展示
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {displayRelics.map((relic) => (
            <NftCard key={relic.id} nft={relic} type="relic" />
          ))}
        </div>
      </div>


      {/* Footer Note */}
      <div className="text-center p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700">
        <p className="text-sm text-gray-400">
          💡 這些都是真實玩家鑄造的NFT，展現了遊戲的無限可能性。您也能創造出獨一無二的傑作！
        </p>
      </div>
    </div>
  );
};