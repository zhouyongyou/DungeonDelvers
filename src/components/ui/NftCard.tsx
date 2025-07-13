// src/components/ui/NftCard.tsx (修復VIP等級顯示)

import React, { memo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContract } from '../../config/contracts';
import { bsc } from 'wagmi/chains';
import type { AnyNft, HeroNft, RelicNft, PartyNft, VipNft } from '../../types/nft';
import { getRarityChineseName, getRarityColor as getRarityColorUtil } from '../../utils/rarityConverter';
import ImageWithFallback from './ImageWithFallback';

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
      <ImageWithFallback
        src={fallbackImage} 
        alt={nft.name || `VIP #${nft.id.toString()}`} 
        className="w-full h-full object-cover bg-gray-700 transition-transform duration-300 hover:scale-110"
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
    if ('syncing' in nft && nft.syncing) {
      return (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold z-10 shadow">
          資料同步中
        </div>
      );
    }
    if ('source' in nft && nft.source === 'fallback') {
      return (
        <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold z-10 shadow">
          暫用預設資料
        </div>
      );
    }
    if ('source' in nft && nft.source === 'metadata') {
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

    // 其他類型NFT的通用處理 - 使用增強的圖片組件
    const baseImageClass = "w-full h-full object-cover rounded-lg transition-transform duration-300 hover:scale-110";
    
    // 獲取 NFT 稀有度用於智能回退 - 修正稀有度獲取邏輯
    let rarity: number = 1;
    if ('rarity' in nft) {
      // 確保稀有度是數字並在有效範圍內
      const rarityValue = typeof nft.rarity === 'number' ? nft.rarity : 
                         typeof nft.rarity === 'string' ? parseInt(nft.rarity) : 
                         typeof nft.rarity === 'bigint' ? Number(nft.rarity) : 1;
      rarity = Math.max(1, Math.min(5, rarityValue));
    } else if (nft.type === 'party' && 'partyRarity' in nft) {
      const partyRarity = (nft as PartyNft).partyRarity;
      rarity = Math.max(1, Math.min(5, partyRarity || 1));
    }
    
    return (
      <div className="relative w-full h-full">
        {renderSyncStatus()}
        <ImageWithFallback
          src={nft.image}
          alt={nft.name}
          className={baseImageClass}
          nftType={nft.type}
          rarity={rarity}
          lazy={true}
          showRetry={true}
        />
        {/* 類型標籤 - 左上角 */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold ${
          nft.type === 'hero' ? 'bg-red-600/90 text-white' :
          nft.type === 'relic' ? 'bg-blue-600/90 text-white' :
          nft.type === 'party' ? 'bg-purple-600/90 text-white' :
          nft.type === 'vip' ? 'bg-yellow-600/90 text-black' :
          'bg-gray-600/90 text-white'
        }`}>
          {nft.type === 'hero' ? '🗡️ 英雄' :
           nft.type === 'relic' ? '🔮 聖物' :
           nft.type === 'party' ? '👥 隊伍' :
           nft.type === 'vip' ? '👑 VIP' : '❓ 未知'}
        </div>

        {/* 稀有度星星 - 右上角 - 根據同步狀態動態調整位置 */}
        {(() => {
          let rarity: number = 1;
          if ('rarity' in nft) {
            const rarityValue = typeof nft.rarity === 'number' ? nft.rarity : 
                               typeof nft.rarity === 'string' ? parseInt(nft.rarity) : 
                               typeof nft.rarity === 'bigint' ? Number(nft.rarity) : 1;
            rarity = Math.max(1, Math.min(5, rarityValue));
          } else if (nft.type === 'party' && 'partyRarity' in nft) {
            const partyRarity = (nft as PartyNft).partyRarity;
            rarity = Math.max(1, Math.min(5, partyRarity || 1));
          }
          
          // 如果有同步狀態標籤，星星移到右下
          const hasStatusBadge = ('syncing' in nft && nft.syncing) || 
                                ('source' in nft && (nft.source === 'fallback' || nft.source === 'metadata'));
          
          return (
            <div className={`absolute ${hasStatusBadge ? 'bottom-12 right-2' : 'top-2 right-2'} bg-black/70 text-yellow-400 px-2 py-1 rounded text-xs font-bold`}>
              {'★'.repeat(rarity)}{'☆'.repeat(Math.max(0, 5 - rarity))}
            </div>
          );
        })()}

        {/* 底部屬性顯示 */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between">
          {nft.type === 'hero' && (
            <div className="bg-red-900/80 text-white px-2 py-1 rounded text-xs font-bold">
              ⚔️ {(nft as HeroNft).power?.toLocaleString?.() ?? '0'}
            </div>
          )}
          {nft.type === 'relic' && (
            <div className="bg-blue-900/80 text-white px-2 py-1 rounded text-xs font-bold">
              📦 {(nft as RelicNft).capacity ?? '0'}
            </div>
          )}
          {nft.type === 'party' && (
            <>
              <div className="bg-purple-900/80 text-white px-2 py-1 rounded text-xs font-bold">
                ⚔️ {(nft as PartyNft).totalPower?.toString() ?? '0'}
              </div>
              <div className="bg-purple-900/80 text-white px-2 py-1 rounded text-xs font-bold">
                📦 {(nft as PartyNft).totalCapacity?.toString() ?? '0'}
              </div>
            </>
          )}
        </div>
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
