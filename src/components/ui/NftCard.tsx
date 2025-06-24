import React, { memo } from 'react';
import type { AnyNft, NftType } from '../../types/nft';

interface NftCardProps {
  nft: AnyNft;
  onSelect?: (id: bigint, type: NftType) => void;
  isSelected?: boolean;
  onDisband?: (id: bigint) => void;
}

const NftCardComponent: React.FC<NftCardProps> = ({
  nft,
  onSelect,
  isSelected,
  onDisband,
}) => {
  const { id, name, image, type } = nft;
  const fallbackImage = `https://placehold.co/200x200/FDF6E3/333333?text=${type}+%23${id}`;
  const imageUrl = image?.replace('ipfs://', 'https://ipfs.io/ipfs/');

  const renderAttributes = () => {
    switch (nft.type) {
      case 'hero':
        return (
          <>
            <p className="text-xs text-gray-500">稀有度: {"★".repeat(nft.rarity || 0)}{"☆".repeat(5 - (nft.rarity || 0))}</p>
            <p className="text-lg font-bold mt-1 text-indigo-600">{nft.power.toString()} MP</p>
          </>
        );
      case 'relic':
        return (
          <>
            <p className="text-xs text-gray-500">稀有度: {"★".repeat(nft.rarity || 0)}{"☆".repeat(5 - (nft.rarity || 0))}</p>
            <p className="text-lg font-bold mt-1 text-indigo-600">容量: {nft.capacity}</p>
          </>
        );
      case 'party':
        return (
          <>
            <p className="text-xs text-gray-500">英雄: {nft.heroIds.length} / 聖物: {nft.relicIds.length}</p>
            <p className="text-lg font-bold mt-1 text-indigo-600">{nft.totalPower.toString()} MP</p>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`card-bg p-3 rounded-lg text-center border-2 transition-all overflow-hidden flex flex-col ${isSelected ? 'ring-4 ring-indigo-500' : 'border-transparent'}`}>
      <div
        className="flex-grow cursor-pointer hover:shadow-lg"
        onClick={() => onSelect && onSelect(id, type)}
      >
        <img
          src={imageUrl || fallbackImage}
          onError={(e) => { e.currentTarget.src = fallbackImage; }}
          alt={name || `${type} #${id.toString()}`}
          className="w-full h-auto rounded-md mb-2 object-cover aspect-square bg-gray-200"
          loading="lazy"
        />
        <p className="font-bold text-sm truncate">{name || `${type} #${id.toString()}`}</p>
        {renderAttributes()}
      </div>
      {type === 'party' && onDisband && (
        <button
          onClick={() => onDisband(id)}
          className="mt-2 w-full text-xs bg-red-500 hover:bg-red-600 text-white py-1 rounded-md transition-colors duration-200"
        >
          解散
        </button>
      )}
    </div>
  );
};

export const NftCard = memo(NftCardComponent);