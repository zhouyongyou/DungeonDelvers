// src/components/ui/NftCard.tsx

import React, { memo } from 'react';
import type { AnyNft, NftType, HeroNft, RelicNft, PartyNft, VipNft } from '../../types/nft';

interface NftCardProps {
  nft: AnyNft;
  onSelect?: (id: bigint, type: NftType) => void;
  isSelected?: boolean;
}

// 輔助元件，用於產生星星評級，確保視覺一致性
const StarRating: React.FC<{ rating: number }> = memo(({ rating }) => (
  <div className="flex justify-center items-center text-yellow-400 my-1">
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-600'}>
        ★
      </span>
    ))}
  </div>
));

// NFT 卡片的主元件
const NftCardComponent: React.FC<NftCardProps> = ({ nft, onSelect, isSelected }) => {
  const { id, name, image, type } = nft;
  const fallbackImage = `https://placehold.co/200x200/1F1D36/C0A573?text=${type}+%23${id}`;
  const imageUrl = image?.replace('ipfs://', '[https://ipfs.io/ipfs/](https://ipfs.io/ipfs/)');

  // 根據不同的 NFT 種類，渲染對應的屬性
  const renderAttributes = () => {
    switch (nft.type) {
      case 'hero':
        const hero = nft as HeroNft;
        return (
          <>
            <StarRating rating={hero.rarity} />
            <p className="text-lg font-bold text-indigo-400">{hero.power.toString()} MP</p>
          </>
        );
      case 'relic':
        const relic = nft as RelicNft;
        return (
          <>
            <StarRating rating={relic.rarity} />
            <p className="text-lg font-bold text-teal-400">容量: {relic.capacity}</p>
          </>
        );
      case 'party':
        const party = nft as PartyNft;
        return (
          <>
            <StarRating rating={party.partyRarity} />
            <div className="text-xs text-gray-400 flex justify-center items-center gap-2">
                <span>英雄: {party.heroIds.length}</span>
                <span>/</span>
                <span>聖物: {party.relicIds.length}</span>
            </div>
            <p className="text-lg font-bold mt-1 text-green-400">{party.totalPower.toString()} MP</p>
          </>
        );
      case 'vip':
        const vip = nft as VipNft;
        return (
            <>
                <StarRating rating={5} /> 
                <p className="text-lg font-bold text-yellow-300">等級 {vip.level}</p>
            </>
        );
      default:
        return null;
    }
  };

  return (
    <div 
        className={`card-bg p-3 rounded-xl text-center border-2 transition-all duration-300 ease-in-out flex flex-col overflow-hidden hover:shadow-2xl hover:-translate-y-1 ${isSelected ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-gray-800 border-indigo-500' : 'border-transparent'}`}
    >
      <div className={`flex-grow ${onSelect ? 'cursor-pointer' : ''}`} onClick={() => onSelect && onSelect(id, type)}>
        <div className="aspect-square w-full mb-2 overflow-hidden rounded-lg">
            <img 
                src={imageUrl || fallbackImage} 
                onError={(e) => { e.currentTarget.src = fallbackImage; }} 
                alt={name || `${type} #${id.toString()}`} 
                className="w-full h-full object-cover bg-gray-700 transition-transform duration-300 hover:scale-110" 
                loading="lazy"
            />
        </div>
        <p className="font-bold text-sm truncate text-gray-200">{name || `${type} #${id.toString()}`}</p>
        <div className="min-h-[48px]">
            {renderAttributes()}
        </div>
      </div>
    </div>
  );
};

// 使用 React.memo 進行性能優化，只有在 props 改變時才會重新渲染
export const NftCard = memo(NftCardComponent);
