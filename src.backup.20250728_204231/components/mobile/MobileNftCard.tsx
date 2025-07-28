import React, { useState } from 'react';
import { BaseNft } from '../../types/nft';
import { formatMobileAddress } from '../../utils/mobileUtils';
import { createTouchHandler } from '../../utils/mobileUtils';
import ImageWithFallback from '../ui/ImageWithFallback';

interface MobileNftCardProps {
  nft: BaseNft;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  compact?: boolean;
}

export const MobileNftCard: React.FC<MobileNftCardProps> = ({
  nft,
  onPress,
  onLongPress,
  selected = false,
  compact = false,
}) => {
  // Note: imageError state removed as ImageWithFallback handles errors internally
  
  const touchHandlers = createTouchHandler(
    () => onPress?.(),
    () => onLongPress?.(),
    500
  );

  const renderAttribute = (label: string, value: string | number) => (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-300">{value}</span>
    </div>
  );

  if (compact) {
    return (
      <div
        className={`
          relative bg-gray-800 rounded-lg p-2 
          transition-all duration-200 active:scale-95
          ${selected ? 'ring-2 ring-indigo-500' : ''}
        `}
        {...touchHandlers}
      >
        {/* 圖片 - 使用增強的圖片組件 */}
        <div className="aspect-square rounded overflow-hidden bg-gray-900 mb-2">
          <ImageWithFallback
            src={nft.image || ''}
            alt={nft.name || ''}
            className="w-full h-full object-cover"
            nftType={nft.type as any}
            rarity={('rarity' in nft ? nft.rarity as number : 1)}
            lazy={true}
            showRetry={false} // 手機模式緊湊顯示，不顯示重試按鈕
          />
        </div>

        {/* 簡要信息 */}
        <div className="text-center">
          <p className="text-xs font-medium text-white truncate">
            {nft.name}
          </p>
          {nft.type === 'hero' && 'power' in nft && (
            <p className="text-xs text-indigo-400">⚔️ {nft.power}</p>
          )}
          {nft.type === 'relic' && 'capacity' in nft && (
            <p className="text-xs text-teal-400">📦 {nft.capacity}</p>
          )}
        </div>

        {/* 選中標記 */}
        {selected && (
          <div className="absolute top-1 right-1 bg-indigo-500 rounded-full p-1">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        bg-gray-800 rounded-xl overflow-hidden
        transition-all duration-200 active:scale-98
        ${selected ? 'ring-2 ring-indigo-500' : ''}
      `}
      {...touchHandlers}
    >
      {/* 圖片區域 - 使用增強的圖片組件 */}
      <div className="aspect-square relative overflow-hidden bg-gray-900">
        <ImageWithFallback
          src={nft.image || ''}
          alt={nft.name || ''}
          className="w-full h-full object-cover"
          nftType={nft.type as any}
          rarity={('rarity' in nft ? nft.rarity as number : 1)}
          lazy={true}
          showRetry={true} // 完整模式顯示重試按鈕
        />

        {/* NFT 類型標籤 */}
        <div className="absolute top-2 left-2">
          <span className={`
            px-2 py-1 text-xs font-medium rounded-full
            ${nft.type === 'hero' ? 'bg-red-500/80 text-white' : ''}
            ${nft.type === 'relic' ? 'bg-blue-500/80 text-white' : ''}
            ${nft.type === 'party' ? 'bg-purple-500/80 text-white' : ''}
            ${nft.type === 'vip' ? 'bg-yellow-500/80 text-black' : ''}
          `}>
            {nft.type.toUpperCase()}
          </span>
        </div>

        {/* 稀有度（如果有） */}
        {'rarity' in nft && (
          <div className="absolute top-2 right-2">
            <div className="flex space-x-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-xs ${i < (nft.rarity || 1) ? 'text-yellow-400' : 'text-gray-600'}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 信息區域 */}
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm mb-2 truncate">
          {nft.name}
        </h3>

        {/* 屬性列表 */}
        <div className="space-y-1">
          {nft.type === 'hero' && 'power' in nft && (
            renderAttribute('戰力', nft.power)
          )}
          {nft.type === 'relic' && 'capacity' in nft && (
            renderAttribute('容量', nft.capacity)
          )}
          {nft.type === 'party' && 'totalPower' in nft && (
            <>
              {renderAttribute('總戰力', nft.totalPower.toString())}
              {renderAttribute('隊伍稀有度', nft.partyRarity)}
            </>
          )}
        </div>

        {/* Token ID */}
        <div className="mt-2 pt-2 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            Token #{nft.id.toString()}
          </p>
        </div>
      </div>

      {/* 選中覆蓋層 */}
      {selected && (
        <div className="absolute inset-0 bg-indigo-500/20 pointer-events-none">
          <div className="absolute top-4 right-4 bg-indigo-500 rounded-full p-2">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};