// src/components/ui/NftCard.tsx (簡化版)

import React, { memo } from 'react';
import type { AnyNft, HeroNft, RelicNft, PartyNft, VipNft } from '../../types/nft';

interface NftCardProps {
  nft: AnyNft;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  showDetails?: boolean;
  className?: string;
}

const VipImage: React.FC<{ nft: VipNft; fallbackImage: string }> = memo(({ nft, fallbackImage }) => {
  // 簡化VIP圖片處理，直接使用靜態圖片
  const vipLevel = nft.attributes?.find(attr => attr.trait_type === 'Level')?.value || '?';
  
  return (
    <div className="relative w-full h-full">
      <img 
        src={fallbackImage} 
        alt={nft.name || `VIP #${nft.id.toString()}`} 
        className="w-full h-full object-cover bg-gray-700 transition-transform duration-300 hover:scale-110" 
        loading="lazy"
      />
      {/* VIP 等級顯示 */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
        Lv.{vipLevel}
      </div>
    </div>
  );
});

VipImage.displayName = 'VipImage';

const NftCard: React.FC<NftCardProps> = memo(({ 
  nft, 
  onClick, 
  selected = false, 
  disabled = false, 
  showDetails = true,
  className = '' 
}) => {
  const getRarityColor = (rarity: number) => {
    const colors = ['#9ca3af', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
    return colors[rarity - 1] || colors[0];
  };

  const getRarityName = (rarity: number) => {
    const names = ['普通', '優秀', '稀有', '史詩', '傳說', '神話'];
    return names[rarity - 1] || '未知';
  };

  const renderImage = () => {
    const baseImageClass = "w-full h-full object-cover rounded-lg transition-transform duration-300 hover:scale-110";
    
    switch (nft.type) {
      case 'hero': {
        const hero = nft as HeroNft;
        const heroId = (Number(hero.id) % 5) + 1; // 確保在 1-5 範圍內
        return (
          <div className="relative w-full h-full">
            <img 
              src={`/images/hero/hero-${heroId}.png`} 
              alt={hero.name}
              className={baseImageClass}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/hero-placeholder.svg";
              }}
            />
            {/* 戰力顯示 */}
            <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
              ⚔️ {hero.power.toLocaleString()}
            </div>
          </div>
        );
      }
      
      case 'relic': {
        const relic = nft as RelicNft;
        const relicId = (Number(relic.id) % 5) + 1; // 確保在 1-5 範圍內
        return (
          <div className="relative w-full h-full">
            <img 
              src={`/images/relic/relic-${relicId}.png`} 
              alt={relic.name}
              className={baseImageClass}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/relic-placeholder.svg";
              }}
            />
            {/* 容量顯示 */}
            <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
              📦 {relic.capacity}
            </div>
          </div>
        );
      }
      
      case 'party': {
        const party = nft as PartyNft;
        return (
          <div className="relative w-full h-full">
            <img 
              src="/images/party/party.png" 
              alt={party.name}
              className={baseImageClass}
              loading="lazy"
            />
            {/* 隊伍資訊顯示 */}
            <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
              ⚔️ {party.totalPower.toString()}
            </div>
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
              📦 {party.totalCapacity.toString()}
            </div>
          </div>
        );
      }
      
      case 'vip': {
        const vip = nft as VipNft;
        return (
          <VipImage 
            nft={vip} 
            fallbackImage="/images/vip-placeholder.png" 
          />
        );
      }
    }
  };

  const renderDetails = () => {
    if (!showDetails) return null;

    // 處理不同NFT類型的稀有度
    let rarity = 1;
    if ('rarity' in nft && typeof nft.rarity === 'number') {
      rarity = nft.rarity;
    } else if (nft.type === 'party') {
      const party = nft as PartyNft;
      rarity = party.partyRarity || 1;
    }

    return (
      <div className="p-3 space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-white text-sm truncate flex-1">
            {nft.name}
          </h3>
          <span 
            className="text-xs font-bold px-2 py-1 rounded ml-2"
            style={{ 
              backgroundColor: getRarityColor(rarity) + '20',
              color: getRarityColor(rarity)
            }}
          >
            {getRarityName(rarity)}
          </span>
        </div>
        
        {nft.description && (
          <p className="text-gray-400 text-xs line-clamp-2">
            {nft.description}
          </p>
        )}
        
        {nft.attributes && nft.attributes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {nft.attributes.slice(0, 3).map((attr, index) => (
              <span 
                key={index}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
              >
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`
        bg-gray-800 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer
        ${selected ? 'border-blue-500 shadow-lg shadow-blue-500/25' : 'border-gray-700 hover:border-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105'}
        ${className}
      `}
      onClick={disabled ? undefined : onClick}
    >
      <div className="aspect-square">
        {renderImage()}
      </div>
      {renderDetails()}
    </div>
  );
});

NftCard.displayName = 'NftCard';

export { NftCard };
