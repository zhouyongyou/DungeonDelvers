// PerformanceMonitor.tsx - 性能監控組件
// 實時監控 RPC 請求、子圖查詢和去重效果

import React, { useState, useEffect, memo } from 'react';
import { useRequestStats } from '../../hooks/useRequestDeduper';
import { logger } from '../../utils/logger';

interface PerformanceStats {
  totalRequests: number;
  dedupedRequests: number;
  savingsPercentage: number;
  avgResponseTime: number;
  failedRequests: number;
}

interface RequestMetrics {
  rpcRequests: number;
  subgraphQueries: number;
  cacheHits: number;
  totalRequestTime: number;
}

export const PerformanceMonitor: React.FC<{
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}> = memo(({ 
  enabled = false, 
  position = 'bottom-right',
  compact = false 
}) => {
  const [stats, setStats] = useState<PerformanceStats>({
    totalRequests: 0,
    dedupedRequests: 0,
    savingsPercentage: 0,
    avgResponseTime: 0,
    failedRequests: 0
  });

  const [metrics, setMetrics] = useState<RequestMetrics>({
    rpcRequests: 0,
    subgraphQueries: 0,
    cacheHits: 0,
    totalRequestTime: 0
  });

  const [isVisible, setIsVisible] = useState(false);
  const { getStats, cleanup } = useRequestStats();

  // 更新統計數據
  useEffect(() => {
    if (!enabled) return;

    const updateStats = () => {
      const requestStats = getStats();
      const entries = Object.entries(requestStats);
      
      const totalRequests = entries.reduce((sum, [_, stat]) => sum + stat.count, 0);
      const dedupedRequests = entries.filter(([_, stat]) => stat.count > 1).length;
      const savingsPercentage = totalRequests > 0 ? (dedupedRequests / totalRequests) * 100 : 0;

      setStats({
        totalRequests,
        dedupedRequests,
        savingsPercentage,
        avgResponseTime: 0, // TODO: 實際計算響應時間
        failedRequests: 0 // TODO: 實際計算失敗請求
      });

      // 分類統計不同類型的請求
      const rpcRequests = entries.filter(([key]) => key.includes('contractRead')).length;
      const subgraphQueries = entries.filter(([key]) => key.includes('subgraphQuery')).length;
      const cacheHits = entries.filter(([_, stat]) => stat.count > 1).length;

      setMetrics({
        rpcRequests,
        subgraphQueries,
        cacheHits,
        totalRequestTime: 0 // TODO: 實際計算總請求時間
      });
    };

    // 初始更新
    updateStats();

    // 定期更新
    const interval = setInterval(updateStats, 2000);
    
    // 定期清理過期統計
    const cleanupInterval = setInterval(cleanup, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, [enabled, getStats, cleanup]);

  // 鍵盤快捷鍵控制顯示
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(prev => !prev);
        logger.info('Performance monitor toggled:', !isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!enabled || !isVisible) {
    return null;
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getSavingsColor = (percentage: number) => {
    if (percentage >= 30) return 'text-green-400';
    if (percentage >= 15) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (compact) {
    return (
      <div 
        className={`fixed ${positionClasses[position]} z-50 bg-black/80 backdrop-blur-sm 
                   border border-gray-600 rounded-lg p-2 text-xs font-mono text-white
                   shadow-lg cursor-pointer hover:bg-black/90 transition-colors`}
        onClick={() => setIsVisible(false)}
        title="點擊關閉性能監控 (Ctrl+Shift+P 切換)"
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
            <span>RPC: {metrics.rpcRequests}</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-400 rounded-full mr-1"></div>
            <span>GQL: {metrics.subgraphQueries}</span>
          </div>
          <div className={`flex items-center ${getSavingsColor(stats.savingsPercentage)}`}>
            <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
            <span>節省: {stats.savingsPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 bg-black/90 backdrop-blur-sm 
                 border border-gray-600 rounded-lg p-4 text-sm font-mono text-white
                 shadow-xl min-w-[280px] max-w-[320px]`}
    >
      {/* 標題欄 */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-600">
        <h3 className="text-white font-semibold flex items-center">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
          性能監控
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
          title="關閉監控"
        >
          ×
        </button>
      </div>

      {/* 請求統計 */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between">
          <span className="text-gray-300">總請求數:</span>
          <span className="text-blue-400 font-medium">{stats.totalRequests}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">去重請求:</span>
          <span className="text-yellow-400 font-medium">{stats.dedupedRequests}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">節省率:</span>
          <span className={`font-medium ${getSavingsColor(stats.savingsPercentage)}`}>
            {stats.savingsPercentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 請求分類 */}
      <div className="space-y-2 mb-3 pt-2 border-t border-gray-700">
        <div className="flex justify-between">
          <span className="text-gray-300 flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
            RPC 請求:
          </span>
          <span className="text-blue-400 font-medium">{metrics.rpcRequests}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300 flex items-center">
            <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
            子圖查詢:
          </span>
          <span className="text-purple-400 font-medium">{metrics.subgraphQueries}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300 flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            緩存命中:
          </span>
          <span className="text-green-400 font-medium">{metrics.cacheHits}</span>
        </div>
      </div>

      {/* 控制說明 */}
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
        <div>快捷鍵: Ctrl+Shift+P</div>
        <div>點擊標題欄關閉</div>
      </div>
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

/**
 * 性能監控 Hook
 * 提供程式化的性能數據訪問
 */
export function usePerformanceMonitor() {
  const { getStats } = useRequestStats();
  
  return {
    getStats,
    getCurrentMetrics: () => {
      const stats = getStats();
      const entries = Object.entries(stats);
      
      return {
        totalRequests: entries.reduce((sum, [_, stat]) => sum + stat.count, 0),
        dedupedRequests: entries.filter(([_, stat]) => stat.count > 1).length,
        rpcRequests: entries.filter(([key]) => key.includes('contractRead')).length,
        subgraphQueries: entries.filter(([key]) => key.includes('subgraphQuery')).length,
        cacheHits: entries.filter(([_, stat]) => stat.count > 1).length
      };
    }
  };
}

export default PerformanceMonitor;