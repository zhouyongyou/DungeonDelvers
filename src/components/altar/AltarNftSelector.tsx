// src/components/altar/AltarNftSelector.tsx
// 祭品選擇器組件 - 支持分頁和一鍵選取

import React, { useState, useMemo, useCallback } from 'react';
import { NftCard } from '../ui/NftCard';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import type { AnyNft, HeroNft, RelicNft, NftType } from '../../types/nft';

interface AltarNftSelectorProps {
  nfts: AnyNft[];
  selectedIds: bigint[];
  onSelectNft: (id: bigint) => void;
  maxSelection: number;
  nftType: NftType;
  isLoading?: boolean;
  className?: string;
}

const ITEMS_PER_PAGE = 10;

export const AltarNftSelector: React.FC<AltarNftSelectorProps> = ({
  nfts,
  selectedIds,
  onSelectNft,
  maxSelection,
  nftType,
  isLoading = false,
  className = ''
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'power' | 'rarity' | 'id'>('power');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 排序和分頁邏輯
  const sortedNfts = useMemo(() => {
    if (!nfts.length) return [];

    const sorted = [...nfts].sort((a, b) => {
      let valueA: number, valueB: number;
      
      switch (sortBy) {
        case 'power':
          valueA = 'power' in a ? a.power : 0;
          valueB = 'power' in b ? b.power : 0;
          break;
        case 'rarity':
          valueA = 'rarity' in a ? a.rarity : ('capacity' in a ? a.capacity : 0);
          valueB = 'rarity' in b ? b.rarity : ('capacity' in b ? b.capacity : 0);
          break;
        case 'id':
        default:
          valueA = Number(a.tokenId);
          valueB = Number(b.tokenId);
          break;
      }
      
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    });
    
    return sorted;
  }, [nfts, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedNfts.length / ITEMS_PER_PAGE);
  const currentPageNfts = sortedNfts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 一鍵選取最低戰力/容量
  const handleSelectLowest = useCallback(() => {
    const availableNfts = sortedNfts.filter(nft => !selectedIds.includes(nft.tokenId));
    const needCount = Math.min(maxSelection - selectedIds.length, availableNfts.length);
    
    // 按戰力/容量升序排序，選取最低的
    const lowestNfts = availableNfts
      .sort((a, b) => {
        const valueA = 'power' in a ? a.power : ('capacity' in a ? a.capacity : 0);
        const valueB = 'power' in b ? b.power : ('capacity' in b ? b.capacity : 0);
        return valueA - valueB;
      })
      .slice(0, needCount);

    lowestNfts.forEach(nft => onSelectNft(nft.tokenId));
  }, [sortedNfts, selectedIds, maxSelection, onSelectNft]);

  // 一鍵清除選擇
  const handleClearAll = useCallback(() => {
    selectedIds.forEach(id => onSelectNft(id));
  }, [selectedIds, onSelectNft]);

  // 切換排序
  const handleSortChange = useCallback((newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setCurrentPage(1); // 重置到第一頁
  }, [sortBy]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!nfts.length) {
    return (
      <div className={`space-y-4 ${className}`}>
        <EmptyState
          title={`沒有可用的${nftType === 'hero' ? '英雄' : '聖物'}`}
          description="請先獲取一些NFT作為祭品"
          icon={nftType === 'hero' ? '🦸' : '🏺'}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 控制面板 */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
        {/* 選擇狀態和操作按鈕 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            已選擇 <span className="font-bold text-yellow-400">{selectedIds.length}</span> / {maxSelection}
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <ActionButton
                onClick={handleClearAll}
                variant="secondary"
                className="px-3 py-1 text-sm h-8"
              >
                🗑️ 清除
              </ActionButton>
            )}
            {selectedIds.length < maxSelection && (
              <ActionButton
                onClick={handleSelectLowest}
                className="px-3 py-1 text-sm h-8 bg-gradient-to-r from-blue-600 to-blue-500"
              >
                ⚡ 選最低{nftType === 'hero' ? '戰力' : '容量'}
              </ActionButton>
            )}
          </div>
        </div>

        {/* 排序控制 */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">排序：</span>
          {(['power', 'rarity', 'id'] as const).map(sort => (
            <button
              key={sort}
              onClick={() => handleSortChange(sort)}
              className={`px-2 py-1 rounded transition-colors ${
                sortBy === sort
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {sort === 'power' ? (nftType === 'hero' ? '戰力' : '容量') :
               sort === 'rarity' ? '星級' : 'ID'}
              {sortBy === sort && (
                <span className="ml-1">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 分頁控制 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              第 {currentPage} / {totalPages} 頁，共 {sortedNfts.length} 個
            </div>
            <div className="flex items-center gap-1">
              <ActionButton
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="secondary"
                className="px-2 py-1 text-sm h-8"
              >
                ←
              </ActionButton>
              
              {/* 頁碼按鈕 */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else {
                  const start = Math.max(1, currentPage - 2);
                  const end = Math.min(totalPages, start + 4);
                  pageNum = start + i;
                  if (pageNum > end) return null;
                }
                
                return (
                  <ActionButton
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    variant={currentPage === pageNum ? 'primary' : 'secondary'}
                    className="px-2 py-1 text-sm h-8 min-w-8"
                  >
                    {pageNum}
                  </ActionButton>
                );
              })}
              
              <ActionButton
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                variant="secondary"
                className="px-2 py-1 text-sm h-8"
              >
                →
              </ActionButton>
            </div>
          </div>
        )}
      </div>

      {/* NFT 網格顯示 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {currentPageNfts.map((nft) => {
          const isSelected = selectedIds.includes(nft.tokenId);
          const canSelect = !isSelected && selectedIds.length < maxSelection;
          
          return (
            <div
              key={nft.tokenId.toString()}
              className={`relative transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-yellow-400 scale-105 shadow-lg shadow-yellow-400/25'
                  : canSelect
                    ? 'hover:scale-105 cursor-pointer opacity-90 hover:opacity-100'
                    : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => (isSelected || canSelect) && onSelectNft(nft.tokenId)}
            >
              <NftCard
                nft={nft}
                showActions={false}
                compact
              />
              
              {/* 選中標記 */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold text-xs shadow-lg">
                  ✓
                </div>
              )}
              
              {/* 不可選標記 */}
              {!isSelected && !canSelect && (
                <div className="absolute inset-0 bg-gray-900/60 rounded-lg flex items-center justify-center">
                  <div className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-300">
                    已滿
                  </div>
                </div>
              )}
              
              {/* 關鍵信息顯示 */}
              <div className="absolute bottom-1 left-1 right-1 bg-black/60 rounded text-xs text-center text-white px-1">
                {nftType === 'hero' && 'power' in nft && (
                  <div>戰力 {nft.power}</div>
                )}
                {nftType === 'relic' && 'capacity' in nft && (
                  <div>容量 {nft.capacity}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 底部提示 */}
      <div className="text-center text-sm text-gray-400">
        {selectedIds.length === maxSelection ? (
          <span className="text-yellow-400">✨ 祭品已選滿，可以開始儀式了！</span>
        ) : (
          <span>還需選擇 {maxSelection - selectedIds.length} 個祭品</span>
        )}
      </div>
    </div>
  );
};

export default AltarNftSelector;