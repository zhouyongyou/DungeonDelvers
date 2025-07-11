// src/components/ui/NftCard.tsx (響應式設計優化版)

import React, { memo, useState, useEffect } from 'react';
import type { AnyNft, HeroNft, RelicNft, PartyNft, VipNft, BaseNft } from '../../types/nft';

interface NftCardProps {
  nft: AnyNft;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  showDetails?: boolean;
  className?: string;
}

const VipImage: React.FC<{ nft: VipNft; fallbackImage: string }> = memo(({ nft, fallbackImage }) => {
  const [svgImage, setSvgImage] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<'loading' | 'success' | 'error' | 'retrying'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const fetchVipImage = async () => {
    try {
      setLoadingState('loading');
      const response = await fetch(nft.image);
      if (!response.ok) throw new Error('Failed to fetch VIP image');
      const svgText = await response.text();
      setSvgImage(svgText);
      setLoadingState('success');
    } catch (error) {
      console.warn(`VIP NFT ${nft.id} 圖片載入失敗:`, error);
      setLoadingState('error');
    }
  };

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setLoadingState('retrying');
      setTimeout(fetchVipImage, 1000);
    }
  };

  useEffect(() => {
    if (nft.image && nft.image.startsWith('data:image/svg+xml')) {
      setSvgImage(nft.image);
      setLoadingState('success');
    } else if (nft.image) {
      fetchVipImage();
    } else {
      setLoadingState('error');
    }
  }, [nft.image]);

  // 載入狀態顯示
  if (loadingState === 'loading') {
    return (
      <div className="w-full h-full bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2">
        <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full mb-1"></div>
        <span className="text-xs text-gray-400">載入中...</span>
      </div>
    );
  }

  // 重試狀態顯示
  if (loadingState === 'retrying') {
    return (
      <div className="w-full h-full bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2">
        <div className="animate-pulse w-6 h-6 bg-yellow-400 rounded-full mb-1"></div>
        <span className="text-xs text-yellow-400">重試中 ({retryCount}/{maxRetries})</span>
      </div>
    );
  }

  // 錯誤狀態顯示 - 更友好的錯誤界面
  if (loadingState === 'error') {
    return (
      <div className="w-full h-full bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2">
        <div className="text-red-400 text-sm mb-1">⚠️</div>
        <span className="text-xs text-red-400 text-center mb-1">載入失敗</span>
        {retryCount < maxRetries && (
          <button 
            onClick={handleRetry}
            className="text-xs text-blue-400 hover:text-blue-300 underline px-1 py-0.5 rounded transition-colors"
            disabled={['retrying', 'loading'].includes(loadingState)}
          >
            重試
          </button>
        )}
        {retryCount >= maxRetries && (
          <span className="text-xs text-gray-500">使用預設圖片</span>
        )}
      </div>
    );
  }

  // 沒有 SVG 圖片時的回退處理
  if (!svgImage) {
    return (
      <img 
        src={nft.image?.replace('ipfs://', 'https://ipfs.io/ipfs/') || fallbackImage} 
        onError={(e) => { 
          // eslint-disable-next-line no-console
          console.warn(`VIP NFT ${nft.id} 回退圖片載入失敗，使用預設圖片`);
          e.currentTarget.src = fallbackImage; 
        }} 
        onLoad={() => {
          // eslint-disable-next-line no-console
          console.log(`VIP NFT ${nft.id} 使用回退圖片載入成功`);
        }}
        alt={nft.name || `VIP #${nft.id.toString()}`} 
        className="w-full h-full object-cover bg-gray-700 transition-transform duration-300 hover:scale-110" 
        loading="lazy"
      />
    );
  }

  // 解析 VIP 等級
  const vipLevel = nft.attributes?.find(attr => attr.trait_type === 'Level')?.value || '?';

  return (
    <div className="relative w-full h-full">
      <div 
        className="w-full h-full bg-gray-700 rounded-lg"
        dangerouslySetInnerHTML={{ __html: svgImage }}
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
        return (
          <div className="relative w-full h-full">
            <img 
              src={hero.image || '/images/hero-placeholder.svg'} 
              alt={hero.name}
              className={baseImageClass}
              loading="lazy"
              onError={(e) => {
                console.error('英雄圖片載入失敗:', e);
                e.currentTarget.src = '/images/hero-placeholder.svg';
              }}
            />
            {/* 戰力顯示 */}
            <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
              ⚔️ {Number(hero.power).toLocaleString()}
            </div>
          </div>
        );
      }
      
      case 'relic': {
        const relic = nft as RelicNft;
        return (
          <div className="relative w-full h-full">
            <img 
              src={relic.image || '/images/relic-placeholder.svg'} 
              alt={relic.name}
              className={baseImageClass}
              loading="lazy"
              onError={(e) => {
                console.error('聖物圖片載入失敗:', e);
                e.currentTarget.src = '/images/relic-placeholder.svg';
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
              src={party.image || '/images/party-placeholder.svg'} 
              alt={party.name}
              className={baseImageClass}
              loading="lazy"
              onError={(e) => {
                console.error('隊伍圖片載入失敗:', e);
                e.currentTarget.src = '/images/party-placeholder.svg';
              }}
            />
            {/* 隊伍戰力顯示 */}
            <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
              ⚔️ {Number(party.totalPower).toLocaleString()}
            </div>
                         {/* 隊伍狀態顯示 */}
             {party.partyRarity > 0 && (
               <div className="absolute top-2 right-2 bg-blue-500/80 text-white px-2 py-1 rounded text-xs font-bold">
                 ⭐ {party.partyRarity}
               </div>
             )}
          </div>
        );
      }
      
      case 'vip': {
        const vip = nft as VipNft;
        return (
          <VipImage 
            nft={vip} 
            fallbackImage="/images/vip-placeholder.svg" 
          />
        );
      }
      
             default:
         return (
           <img 
             src={(nft as BaseNft).image || '/images/nft-placeholder.svg'} 
             alt={(nft as BaseNft).name}
             className={baseImageClass}
             loading="lazy"
           />
         );
    }
  };

  const renderDetails = () => {
    if (!showDetails) return null;

    return (
      <div className="p-3 space-y-2">
                 {/* 標題和稀有度 */}
         <div className="flex items-start justify-between">
           <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
             {nft.name}
           </h3>
           {('rarity' in nft && nft.rarity) && (
             <span 
               className="ml-2 px-2 py-1 rounded text-xs font-bold text-white flex-shrink-0"
               style={{ backgroundColor: getRarityColor(nft.rarity) }}
             >
               {getRarityName(nft.rarity)}
             </span>
           )}
         </div>

        {/* 描述 */}
        {nft.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {nft.description}
          </p>
        )}

        {/* 屬性列表 */}
        {nft.attributes && nft.attributes.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {nft.attributes.slice(0, 4).map((attr, index) => (
              <div key={index} className="text-xs">
                <span className="text-gray-500 dark:text-gray-400">{attr.trait_type}:</span>
                <span className="ml-1 text-gray-700 dark:text-gray-300 font-medium">
                  {attr.value}
                </span>
              </div>
            ))}
          </div>
        )}

                 {/* 特殊屬性顯示 */}
         {nft.type === 'party' && (
           <div className="text-xs text-gray-600 dark:text-gray-400">
             <span>英雄: {(nft as PartyNft).heroIds.length}</span>
             <span className="ml-2">聖物: {(nft as PartyNft).relicIds.length}</span>
           </div>
         )}
      </div>
    );
  };

  return (
    <div 
      className={`
        card-bg rounded-xl overflow-hidden cursor-pointer transition-all duration-300
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-1'}
        ${onClick ? 'hover:scale-105' : ''}
        ${className}
      `}
      onClick={disabled ? undefined : onClick}
    >
      {/* 圖片區域 - 保持 1:1 比例 */}
      <div className="aspect-square relative overflow-hidden">
        {renderImage()}
        
        {/* 選擇指示器 */}
        {selected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* 詳細資訊 */}
      {renderDetails()}
    </div>
  );
});

NftCard.displayName = 'NftCard';

export { NftCard };
export default NftCard;
