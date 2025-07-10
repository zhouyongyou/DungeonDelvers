// src/components/ui/NftCard.tsx

import React, { memo, useState, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { Buffer } from 'buffer';
import { getContract } from '../../config/contracts';
import { bsc } from 'wagmi/chains';
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

// VIP卡專用的圖片顯示組件
const VipImage: React.FC<{ nft: VipNft; fallbackImage: string }> = memo(({ nft, fallbackImage }) => {
  const vipStakingContract = getContract(bsc.id, 'vipStaking');
  const [hasError, setHasError] = useState(false);
  const [vipLevel, setVipLevel] = useState<number | null>(null);
  
  const { data: tokenURI, isLoading } = useReadContract({
    ...vipStakingContract,
    functionName: 'tokenURI',
    args: [nft.id],
    query: { 
      enabled: !!vipStakingContract && !hasError,
      staleTime: 1000 * 60 * 5, // 5分鐘緩存
    },
  });

  const svgImage = useMemo(() => {
    if (!tokenURI) return null;
    try {
      const uriString = typeof tokenURI === 'string' ? tokenURI : '';
      if (!uriString.startsWith('data:application/json;base64,')) {
        return uriString;
      }
      const decodedUri = Buffer.from(uriString.substring('data:application/json;base64,'.length), 'base64').toString();
      const metadata = JSON.parse(decodedUri);
      
      // 嘗試從metadata中提取VIP等級
      if (metadata.attributes && Array.isArray(metadata.attributes)) {
        const levelAttr = metadata.attributes.find((attr: any) => attr.trait_type === 'Level');
        if (levelAttr && typeof levelAttr.value === 'number') {
          setVipLevel(levelAttr.value);
        }
      }
      
      return metadata.image;
    } catch (e) {
      console.error("解析 VIP 卡 SVG 失敗:", e);
      setHasError(true);
      return null;
    }
  }, [tokenURI]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (hasError || !svgImage) {
    // 回退到使用原始圖片
    return (
      <div className="w-full h-full bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2">
        <img 
          src={nft.image?.replace('ipfs://', 'https://ipfs.io/ipfs/') || fallbackImage} 
          onError={(e) => { e.currentTarget.src = fallbackImage; }} 
          alt={nft.name || `VIP #${nft.id.toString()}`} 
          className="w-full h-3/4 object-cover rounded"
          loading="lazy"
        />
        {vipLevel && (
          <div className="mt-1 text-xs text-yellow-400 font-bold">
            LV {vipLevel}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <img 
        src={svgImage} 
        onError={() => setHasError(true)}
        alt={nft.name || `VIP #${nft.id.toString()}`} 
        className="w-full h-full object-cover bg-gray-700 rounded-lg" 
        loading="lazy"
      />
      {vipLevel && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-black/70 text-yellow-400 text-xs font-bold px-2 py-1 rounded">
          LV {vipLevel}
        </div>
      )}
    </div>
  );
});

// NFT 卡片的主元件
const NftCardComponent: React.FC<NftCardProps> = ({ nft, onSelect, isSelected }) => {
  const { id, name, image, type } = nft;
  const fallbackImage = `https://placehold.co/200x200/1F1D36/C0A573?text=${type}+%23${id}`;
  const imageUrl = image?.replace('ipfs://', 'https://ipfs.io/ipfs/');

  // 根據不同的 NFT 種類，渲染對應的屬性
  const renderAttributes = () => {
    switch (nft.type) {
      case 'hero': {  // ✅ 添加大括號
        const hero = nft as HeroNft;
        return (
          <>
            <StarRating rating={hero.rarity} />
            <p className="text-lg font-bold text-indigo-400">{hero.power.toString()} MP</p>
          </>
        );
      }
      case 'relic': {  // ✅ 添加大括號
        const relic = nft as RelicNft;
        return (
          <>
            <StarRating rating={relic.rarity} />
            <p className="text-lg font-bold text-teal-400">容量: {relic.capacity}</p>
          </>
        );
      }
      case 'party': {  // ✅ 添加大括號
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
      }
      case 'vip': {  // ✅ 添加大括號並改善VIP顯示
        const vip = nft as VipNft;
        // 嘗試從VIP NFT的屬性中獲取等級信息
        const levelAttr = vip.attributes?.find((attr: any) => attr.trait_type === 'Level');
        const vipLevel = levelAttr?.value || '載入中...';
        
        return (
            <>
                <StarRating rating={5} /> 
                <p className="text-sm font-bold text-yellow-300">VIP 會員卡</p>
                <p className="text-xs text-gray-400">等級 {vipLevel}</p>
            </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div 
        className={`card-bg p-3 rounded-xl text-center border-2 transition-all duration-300 ease-in-out flex flex-col overflow-hidden hover:shadow-2xl hover:-translate-y-1 active:scale-95 ${isSelected ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-gray-800 border-indigo-500' : 'border-transparent'}`}
    >
      <div className={`flex-grow ${onSelect ? 'cursor-pointer' : ''}`} onClick={() => onSelect && onSelect(id, type)}>
        <div className={`w-full mb-2 overflow-hidden rounded-lg ${type === 'vip' ? 'aspect-[3/4]' : 'aspect-square'}`}>
            {type === 'vip' ? (
              <VipImage nft={nft as VipNft} fallbackImage={fallbackImage} />
            ) : (
              <img 
                  src={imageUrl || fallbackImage} 
                  onError={(e) => { e.currentTarget.src = fallbackImage; }} 
                  alt={name || `${type} #${id.toString()}`} 
                  className="w-full h-full object-cover bg-gray-700 transition-transform duration-300 hover:scale-110" 
                  loading="lazy"
              />
            )}
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
