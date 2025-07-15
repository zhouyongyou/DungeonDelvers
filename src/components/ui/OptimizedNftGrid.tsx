import React, { useState, useEffect, useMemo } from 'react';
import { NftCard } from './NftCard';
import { ActionButton } from './ActionButton';
import type { AnyNft } from '../../types/nft';

interface OptimizedNftGridProps {
  nfts: AnyNft[];
  pageSize?: number;
}

export const OptimizedNftGrid: React.FC<OptimizedNftGridProps> = ({ 
  nfts, 
  pageSize = 30 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.ceil(nfts.length / pageSize);
  
  // 計算當前頁面要顯示的 NFT
  const currentNfts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return nfts.slice(startIndex, endIndex);
  }, [nfts, currentPage, pageSize]);

  // 當 NFT 列表改變時，重置到第一頁
  useEffect(() => {
    setCurrentPage(1);
  }, [nfts.length]);

  // 模擬載入效果
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 滾動到頂部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (nfts.length === 0) {
    return null;
  }

  return (
    <div>
      {/* 性能提示 */}
      {nfts.length > 100 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-yellow-300">
            🚀 您擁有 {nfts.length} 個資產，已啟用分頁顯示以提升載入速度
          </p>
        </div>
      )}

      {/* NFT 網格 */}
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {currentNfts.map(nft => (
            <NftCard key={`${nft.type}-${nft.id.toString()}`} nft={nft} />
          ))}
        </div>
      </div>

      {/* 分頁控制 */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm"
            >
              上一頁
            </ActionButton>
            
            <div className="flex items-center gap-1">
              {/* 顯示頁碼 */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 text-sm rounded transition ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <ActionButton
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm"
            >
              下一頁
            </ActionButton>
          </div>
          
          <p className="text-sm text-gray-400">
            第 {currentPage} 頁，共 {totalPages} 頁（總計 {nfts.length} 個）
          </p>
        </div>
      )}
    </div>
  );
};