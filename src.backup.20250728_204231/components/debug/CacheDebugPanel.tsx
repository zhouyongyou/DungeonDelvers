// src/components/debug/CacheDebugPanel.tsx
// 缓存调试面板 - 仅在开发环境显示

import React, { useState, useEffect } from 'react';
import { nftMetadataCache } from '../../cache/nftMetadataCache';
import { CacheMetrics } from '../../cache/cacheStrategies';

interface CacheStats {
  totalCached: number;
  cacheSize: number;
}

interface QueryStats {
  hitCount: number;
  missCount: number;
  totalRequests: number;
  hitRate: number;
}

export const CacheDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats>({ totalCached: 0, cacheSize: 0 });
  const [queryStats, setQueryStats] = useState<QueryStats>({ hitCount: 0, missCount: 0, totalRequests: 0, hitRate: 0 });

  const refreshStats = async () => {
    const stats = await nftMetadataCache.getCacheStats();
    setCacheStats(stats);
    setQueryStats(CacheMetrics.getStats());
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      // TEMP_DISABLED: 暫時禁用緩存統計刷新輪詢以避免 RPC 過載
      // const interval = setInterval(refreshStats, 2000); // 每2秒刷新
      // return () => clearInterval(interval);
    }
  }, [isOpen]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearAllCache = async () => {
    if (confirm('确定要清空所有缓存吗？这将删除所有已缓存的NFT metadata。')) {
      await nftMetadataCache.clearAllCache();
      CacheMetrics.reset();
      await refreshStats();
    }
  };

  // 只在开发环境显示
  if (typeof window === 'undefined' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // 开发环境
  } else {
    return null; // 生产环境不显示
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full shadow-lg transition-colors"
        title="缓存调试面板"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      {/* 调试面板 */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 bg-gray-900 text-white p-4 rounded-lg shadow-xl w-80 border border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">🔍 缓存统计</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* IndexedDB 缓存统计 */}
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="font-medium text-blue-400 mb-2">💾 IndexedDB 缓存</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>已缓存NFT:</span>
                  <span className="font-mono">{cacheStats.totalCached}</span>
                </div>
                <div className="flex justify-between">
                  <span>缓存大小:</span>
                  <span className="font-mono">{formatBytes(cacheStats.cacheSize)}</span>
                </div>
              </div>
            </div>

            {/* 查询性能统计 */}
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="font-medium text-green-400 mb-2">⚡ 查询性能</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>缓存命中:</span>
                  <span className="font-mono text-green-400">{queryStats.hitCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>缓存未命中:</span>
                  <span className="font-mono text-red-400">{queryStats.missCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>总请求数:</span>
                  <span className="font-mono">{queryStats.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>命中率:</span>
                  <span className={`font-mono ${queryStats.hitRate > 70 ? 'text-green-400' : queryStats.hitRate > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {queryStats.hitRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={refreshStats}
                className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 px-3 rounded text-sm transition-colors"
              >
                🔄 刷新
              </button>
              <button
                onClick={clearAllCache}
                className="flex-1 bg-red-600 hover:bg-red-500 py-2 px-3 rounded text-sm transition-colors"
              >
                🗑️ 清空
              </button>
            </div>

            {/* 性能提示 */}
            <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
              <div className="mb-1">💡 <strong>优化提示:</strong></div>
              {queryStats.hitRate < 50 && (
                <div className="text-yellow-400">• 缓存命中率较低，考虑预加载热门NFT</div>
              )}
              {cacheStats.totalCached > 1000 && (
                <div className="text-blue-400">• 缓存数据较多，性能良好</div>
              )}
              {queryStats.hitRate > 80 && (
                <div className="text-green-400">• 缓存策略效果优秀！</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheDebugPanel;