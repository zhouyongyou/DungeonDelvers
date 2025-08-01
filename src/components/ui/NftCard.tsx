// src/components/ui/NftCard.tsx (修復VIP等級顯示)

import React, { memo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContractWithABI } from '../../config/contractsWithABI';
import { bsc } from 'wagmi/chains';
import type { AnyNft, HeroNft, RelicNft, PartyNft, VipNft } from '../../types/nft';
import { getRarityChineseName, getRarityColor as getRarityColorUtil } from '../../utils/rarityConverter';
import ImageWithFallback from './ImageWithFallback';
import { LazyImage } from './LazyImage';
import { safeBigintToString, getNftIdSafe, getPartyPowerSafe, getPartyCapacitySafe } from '../../utils/typeGuards';
import { useNftDisplayMode } from '../../hooks/useNftDisplayMode';
import { useImageOptimization } from '../../hooks/useImageOptimization';

interface NftCardProps {
  nft: AnyNft;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  showDetails?: boolean;
  className?: string;
  isCodex?: boolean;
}

const VipImage: React.FC<{ nft: VipNft; fallbackImage: string }> = memo(({ nft, fallbackImage }) => {
  const { address, chainId } = useAccount();
  const vipStakingContract = getContractWithABI('VIPSTAKING');
  
  // ✅ 使用實時合約數據獲取VIP等級，而不是元數據
  const { data: realTimeVipLevel } = useReadContract({
        address: vipStakingContract?.address as `0x${string}`,
        abi: vipStakingContract?.abi,
        functionName: 'getVipLevel',
        args: [address!],
    query: { 
      enabled: !!address && !!vipStakingContract && chainId === bsc.id,
      staleTime: 1000 * 60 * 10, // 10分鐘 - VIP 等級變更不頻繁
      gcTime: 1000 * 60 * 30,    // 30分鐘
      refetchOnWindowFocus: false,
      retry: 2,
    }
  });
  
  // 優先使用實時數據，fallback到元數據
  const displayLevel = realTimeVipLevel !== undefined 
    ? Number(realTimeVipLevel) 
    : (nft.attributes?.find(attr => attr.trait_type === 'Level')?.value || '?');
  
  return (
    <div className="relative w-full h-full">
      <ImageWithFallback
        src={fallbackImage} 
        alt={nft.name || `VIP #${getNftIdSafe(nft)}`} 
        className="w-full h-full object-cover bg-gray-700"
        nftType="vip"
        rarity={1}
        lazy={true}
        showRetry={true}
      />
      {/* VIP 等級顯示 - 使用實時數據 */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
        Lv.{displayLevel}
      </div>
      {/* 如果是實時數據，添加一個小指示器 */}
      {realTimeVipLevel !== undefined && (
        <div className="absolute top-2 left-2 bg-green-500 w-2 h-2 rounded-full" 
             title="實時等級數據" />
      )}
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
  className = '',
  isCodex = false 
}) => {
  const { shouldUseSvg } = useNftDisplayMode();
  const { optimizeImageUrl } = useImageOptimization();
  // 使用新的稀有度轉換工具
  const getRarityColor = (rarity: string | number | bigint) => {
    return getRarityColorUtil(rarity);
  };

  const getRarityName = (rarity: string | number | bigint) => {
    return getRarityChineseName(rarity);
  };

  // 新增：同步/資料來源提示 - 簡化版
  const renderSyncStatus = () => {
    if ('syncing' in nft && nft.syncing) {
      return (
        <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" 
             title="資料同步中"></div>
      );
    }
    if ('source' in nft && nft.source === 'fallback') {
      return (
        <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" 
             title="載入中"></div>
      );
    }
    return null;
  };

  // 幫助函數：將複數型NFT類型轉換為對應的圖片目錄名稱
  const getImageDirName = (nftType: string): string => {
    switch (nftType) {
      case 'heros': return 'hero';
      case 'relics': return 'relic';
      case 'parties': return 'party';
      default: return nftType;
    }
  };

  const renderImage = () => {
    // VIP卡片使用專門的組件
    if (nft.type === 'vip') {
      return <VipImage nft={nft as VipNft} fallbackImage={nft.image} />;
    }

    // 其他類型NFT的通用處理 - 使用增強的圖片組件
    const baseImageClass = "w-full h-full object-cover rounded-lg";
    
    // 獲取 NFT 稀有度用於智能回退 - 修正稀有度獲取邏輯
    let rarity: number = 1;
    if ('rarity' in nft) {
      // 確保稀有度是數字並在有效範圍內
      const rarityValue = typeof nft.rarity === 'number' ? nft.rarity : 
                         typeof nft.rarity === 'string' ? parseInt(nft.rarity) : 
                         typeof nft.rarity === 'bigint' ? Number(nft.rarity) : 1;
      rarity = Math.max(1, Math.min(5, rarityValue));
    } else if (nft.type === 'parties' && 'partyRarity' in nft) {
      const partyRarity = (nft as PartyNft).partyRarity;
      rarity = Math.max(1, Math.min(5, partyRarity || 1));
    }

    const imageDirName = getImageDirName(nft.type);
    
    return (
      <div className="relative w-full h-full overflow-hidden rounded-lg">
        {renderSyncStatus()}
        {/* 總是使用 PNG 圖片，不使用 SVG */}
        <LazyImage
          src={optimizeImageUrl(nft.image, { width: 400, height: 400 })}
          alt={nft.name || `${nft.type} #${nft.id}`}
          className={baseImageClass}
          fallback={`/images/${imageDirName}/${imageDirName}-${rarity}.png`}
          placeholder="skeleton"
          width={400}
          height={400}
          aspectRatio="1/1"
          />
        {/* 只在圖片上顯示最重要的資訊 */}
        {showDetails && (
          <>
            {/* 底部屬性顯示 - 簡化版 */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between">
              {nft.type === 'heros' && (
                <div className="bg-black/60 text-white px-2 py-1 rounded text-xs">
                  ⚔️ {(nft as HeroNft).power?.toLocaleString?.() ?? '0'}
                </div>
              )}
              {nft.type === 'relics' && (
                <div className="bg-black/60 text-white px-2 py-1 rounded text-xs">
                  📦 {(nft as RelicNft).capacity ?? '0'}
                </div>
              )}
              {nft.type === 'parties' && (
                <>
                  <div className="bg-black/60 text-white px-1.5 py-0.5 rounded text-xs">
                    ⚔️ {getPartyPowerSafe(nft)}
                  </div>
                  <div className="bg-black/60 text-white px-1.5 py-0.5 rounded text-xs">
                    📦 {getPartyCapacitySafe(nft)}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderDetails = () => {
    if (!showDetails) return null;

    // 處理不同NFT類型的稀有度 - 使用新的轉換工具
    let rarity: string | number | bigint = 1;
    if ('rarity' in nft && nft.rarity !== undefined) {
      rarity = nft.rarity;
    } else if (nft.type === 'parties') {
      const party = nft as PartyNft;
      rarity = party.partyRarity || 1;
    }

    return (
      <div className="p-3 space-y-1">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-white text-sm truncate flex-1">
            {nft.name}
          </h3>
          <div className="flex items-center gap-1">
            <span className="text-xs text-yellow-400">
              {'★'.repeat(Math.min(5, Number(rarity)))}
            </span>
          </div>
        </div>
        
        {/* 隊伍不需要顯示成員資訊 */}
      </div>
    );
  };

  return (
    <div 
      className={`
        bg-gray-800 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer
        ${selected ? 'border-blue-500 shadow-lg shadow-blue-500/25' : 'border-gray-700 hover:border-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg transform-gpu hover:scale-105'}
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
