import React, { useState, useMemo } from 'react';
import { NftCard } from './NftCard';
import { ActionButton } from './ActionButton';
import type { AnyNft } from '../../types/nft';

interface SelectableNftGridProps {
  nfts: AnyNft[];
  nftType?: 'hero' | 'relic' | 'party' | 'vip';
  onSelect?: (id: bigint) => void;
  selectedIds?: bigint[];
  gridClassName?: string;
  pageSize?: number;
  showSelectedCount?: boolean;
}

export const SelectableNftGrid: React.FC<SelectableNftGridProps> = ({ 
  nfts, 
  nftType,
  onSelect,
  selectedIds = [],
  gridClassName = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  pageSize = 10, // 預設10個一頁（聖物）
  showSelectedCount = true
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedAfterSelection, setCollapsedAfterSelection] = useState(false);
  
  // 根據 NFT 類型調整每頁顯示數量
  const itemsPerPage = nftType === 'hero' ? 25 : pageSize;
  
  const totalPages = Math.ceil(nfts.length / itemsPerPage);
  
  // 計算當前頁面要顯示的 NFT
  const currentNfts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return nfts.slice(startIndex, endIndex);
  }, [nfts, currentPage, itemsPerPage]);

  // 當選擇滿5個聖物時，自動摺疊 - 但保留統計信息
  const shouldCollapse = nftType === 'relic' && selectedIds.length >= 5 && collapsedAfterSelection;

  const handleSelect = (id: bigint) => {
    if (onSelect) {
      onSelect(id);
      // 如果是聖物且選滿5個，設置摺疊狀態
      if (nftType === 'relic' && selectedIds.length === 4 && !selectedIds.includes(id)) {
        setCollapsedAfterSelection(true);
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (nfts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 選擇統計 */}
      {showSelectedCount && selectedIds.length > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-emerald-300">
              已選擇: {selectedIds.length} 個{nftType === 'hero' ? '英雄' : '聖物'}
            </p>
            {nftType === 'relic' && collapsedAfterSelection && (
              <button
                onClick={() => setCollapsedAfterSelection(false)}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                展開查看更多
              </button>
            )}
          </div>
        </div>
      )}

      {/* NFT 網格 - 聖物選滿5個後可摺疊 */}
      {shouldCollapse ? (
        <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-emerald-400 text-lg">✓</div>
              <div>
                <p className="text-emerald-300 font-medium">聖物選擇完成</p>
                <p className="text-sm text-gray-400">已選擇 {selectedIds.length} 個聖物，現在可以選擇英雄</p>
              </div>
            </div>
            <button
              onClick={() => setCollapsedAfterSelection(false)}
              className="text-emerald-400 hover:text-emerald-300 text-sm px-3 py-1 rounded border border-emerald-500/30 hover:border-emerald-400/50 transition-colors"
            >
              重新選擇聖物
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={`grid ${gridClassName} gap-3`}>
            {currentNfts.map(nft => (
              <div
                key={`${nft.type}-${nft.id.toString()}`}
                className={`relative cursor-pointer transform transition-all duration-200 ${
                  selectedIds.includes(nft.id) 
                    ? 'ring-2 ring-emerald-500 scale-105' 
                    : 'hover:scale-102'
                }`}
                onClick={() => handleSelect(nft.id)}
              >
                <NftCard nft={nft} />
                {/* 選中標記 */}
                {selectedIds.includes(nft.id) && (
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 分頁控制 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <ActionButton
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm"
                size="sm"
              >
                上一頁
              </ActionButton>
              
              <span className="text-sm text-gray-400">
                第 {currentPage} / {totalPages} 頁
              </span>
              
              <ActionButton
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm"
                size="sm"
              >
                下一頁
              </ActionButton>
            </div>
          )}
        </>
      )}
    </div>
  );
};