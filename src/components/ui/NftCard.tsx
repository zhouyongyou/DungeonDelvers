// src/components/ui/NftCard.tsx (修復VIP等級顯示)

import React, { memo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContract } from '../../config/contracts';
import { bsc } from 'wagmi/chains';
import type { AnyNft, HeroNft, RelicNft, PartyNft, VipNft } from '../../types/nft';
import { getRarityChineseName, getRarityColor as getRarityColorUtil } from '../../utils/rarityConverter';

interface NftCardProps {
  nft: AnyNft;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  showDetails?: boolean;
  className?: string;
}

const VipImage: React.FC<{ nft: VipNft; fallbackImage: string }> = memo(({ nft, fallbackImage }) => {
  const { address, chainId } = useAccount();
  const vipStakingContract = getContract(chainId === bsc.id ? chainId : bsc.id, 'vipStaking');
  
  // ✅ 使用實時合約數據獲取VIP等級，而不是元數據
  const { data: realTimeVipLevel } = useReadContract({
        address: vipStakingContract?.address as `0x${string}`,
        abi: vipStakingContract?.abi,
        functionName: 'getVipLevel',
        args: [address!],
    query: { 
      enabled: !!address && !!vipStakingContract && chainId === bsc.id
    }
  });
  
  // 優先使用實時數據，fallback到元數據
  const displayLevel = realTimeVipLevel !== undefined 
    ? Number(realTimeVipLevel) 
    : (nft.attributes?.find(attr => attr.trait_type === 'Level')?.value || '?');
  
  return (
    <div className="relative w-full h-full">
      <img 
        src={fallbackImage} 
        alt={nft.name || `VIP #${nft.id.toString()}`} 
        className="w-full h-full object-cover bg-gray-700 transition-transform duration-300 hover:scale-110" 
        loading="lazy"
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
  className = '' 
}) => {
  // 使用新的稀有度轉換工具
  const getRarityColor = (rarity: string | number | bigint) => {
    return getRarityColorUtil(rarity);
  };

  const getRarityName = (rarity: string | number | bigint) => {
    return getRarityChineseName(rarity);
  };

  // 新增：同步/資料來源提示
  const renderSyncStatus = () => {
    if (nft.syncing) {
      return (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold z-10 shadow">
          資料同步中
        </div>
      );
    }
    if (nft.source === 'fallback') {
      return (
        <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold z-10 shadow">
          暫用預設資料
        </div>
      );
    }
    if (nft.source === 'metadata') {
      return (
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold z-10 shadow">
          僅本地資料
        </div>
      );
    }
    return null;
  };

  const renderImage = () => {
    // VIP卡片使用專門的組件
    if (nft.type === 'vip') {
      return <VipImage nft={nft as VipNft} fallbackImage={nft.image} />;
    }

    // 其他類型NFT的通用處理
    const baseImageClass = "w-full h-full object-cover rounded-lg transition-transform duration-300 hover:scale-110";
    return (
      <div className="relative w-full h-full">
        {renderSyncStatus()}
        <img 
          src={nft.image} 
          alt={nft.name}
          className={baseImageClass}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/images/hero/hero-1.png";
          }}
        />
        {/* 額外資訊顯示（如戰力、容量等）可根據 nft.type 顯示 */}
        {nft.type === 'hero' && (
          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
            ⚔️ {(nft as HeroNft).power?.toLocaleString?.() ?? ''}
          </div>
        )}
        {nft.type === 'relic' && (
          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
            📦 {(nft as RelicNft).capacity ?? ''}
          </div>
        )}
        {nft.type === 'party' && (
          <>
            <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
              ⚔️ {(nft as PartyNft).totalPower?.toString() ?? ''}
            </div>
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
              📦 {(nft as PartyNft).totalCapacity?.toString() ?? ''}
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
            {nft.attributes.slice(0, 3).map((attr: unknown, index: number) => (
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
