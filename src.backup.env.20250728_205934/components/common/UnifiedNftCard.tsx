import React, { useState } from 'react';
import { BaseNft } from '../../types/nft';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { useLoadingState } from '../../hooks/useLoadingState';
import ImageWithFallback from '../ui/ImageWithFallback';

interface UnifiedNftCardProps {
  nft: BaseNft;
  loading?: boolean;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onLongPress?: () => void;
  showActions?: boolean;
  onAction?: (action: 'transfer' | 'sell' | 'info') => void;
}

export const UnifiedNftCard: React.FC<UnifiedNftCardProps> = ({
  nft,
  loading = false,
  selected = false,
  compact = false,
  onClick,
  onLongPress,
  showActions = false,
  onAction,
}) => {
  // Note: imageError state removed as ImageWithFallback handles errors internally
  const { isMobile, touchHandlers } = useMobileOptimization();
  const { renderImageLoading, renderTextLoading } = useLoadingState();

  const cardTouchHandlers = touchHandlers(
    () => onClick?.(),
    () => onLongPress?.(),
    500
  );

  const getRarityStars = (rarity?: number) => {
    if (!rarity) return null;
    return Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        className={`text-xs ${i < rarity ? 'text-yellow-400' : 'text-gray-600'}`}
      >
        ★
      </span>
    ));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hero': return 'bg-red-500/80 text-white';
      case 'relic': return 'bg-blue-500/80 text-white';
      case 'party': return 'bg-purple-500/80 text-white';
      case 'vip': return 'bg-yellow-500/80 text-black';
      default: return 'bg-gray-500/80 text-white';
    }
  };

  const renderAttribute = (label: string, value: string | number) => (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-gray-500">{label}</span>
      {renderTextLoading(loading, (
        <span className="text-xs font-medium text-gray-300">{value}</span>
      ), '...')}
    </div>
  );

  if (compact) {
    return (
      <div
        className={`
          relative bg-gray-800 rounded-lg p-2 
          transition-all duration-200 
          ${isMobile ? 'active:scale-95' : 'hover:scale-105'}
          ${selected ? 'ring-2 ring-indigo-500' : ''}
        `}
        {...cardTouchHandlers}
      >
        {/* 圖片 - 使用增強的圖片組件 */}
        <div className="aspect-square rounded overflow-hidden bg-gray-900 mb-2">
          {renderImageLoading(
            loading,
            <ImageWithFallback
              src={nft.image || ''}
              alt={nft.name || ''}
              className="w-full h-full object-cover"
              nftType={nft.type as any}
              rarity={('rarity' in nft ? nft.rarity as number : 1)}
              lazy={true}
              showRetry={false} // 緊湊模式不顯示重試按鈕
            />
          )}
        </div>

        {/* 簡要信息 */}
        <div className="text-center">
          {renderTextLoading(loading, (
            <p className="text-xs font-medium text-white truncate">
              {nft.name}
            </p>
          ))}
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
        transition-all duration-200 
        ${isMobile ? 'active:scale-98' : 'hover:scale-105 hover:shadow-xl'}
        ${selected ? 'ring-2 ring-indigo-500' : ''}
      `}
      {...cardTouchHandlers}
    >
      {/* 圖片區域 - 使用增強的圖片組件 */}
      <div className="aspect-square relative overflow-hidden bg-gray-900">
        {renderImageLoading(
          loading,
          <ImageWithFallback
            src={nft.image || ''}
            alt={nft.name || ''}
            className="w-full h-full object-cover"
            nftType={nft.type as any}
            rarity={('rarity' in nft ? nft.rarity as number : 1)}
            lazy={true}
            showRetry={true} // 完整模式顯示重試按鈕
          />,
          { aspectRatio: 'aspect-square' }
        )}

        {/* NFT 類型標籤 */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(nft.type)}`}>
            {nft.type.toUpperCase()}
          </span>
        </div>

        {/* 稀有度 */}
        {'rarity' in nft && nft.rarity && (
          <div className="absolute top-2 right-2">
            <div className="flex space-x-0.5">
              {getRarityStars(nft.rarity)}
            </div>
          </div>
        )}

        {/* 操作按鈕 */}
        {showActions && !loading && (
          <div className="absolute bottom-2 right-2 flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction?.('info');
              }}
              className="bg-gray-800/80 text-white p-1 rounded-full hover:bg-gray-700/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 信息區域 */}
      <div className="p-3">
        {renderTextLoading(loading, (
          <h3 className="font-semibold text-white text-sm mb-2 truncate">
            {nft.name}
          </h3>
        ))}

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
              {'partyRarity' in nft && renderAttribute('隊伍稀有度', nft.partyRarity)}
            </>
          )}
          {nft.type === 'vip' && 'level' in nft && (
            renderAttribute('等級', nft.level)
          )}
        </div>

        {/* Token ID */}
        <div className="mt-2 pt-2 border-t border-gray-700">
          {renderTextLoading(loading, (
            <p className="text-xs text-gray-500">
              Token #{nft.id.toString()}
            </p>
          ))}
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