// src/components/dev/SystemHealthMonitor.tsx
// 開發環境系統健康監控器

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface HealthMetrics {
  rpcRequests: number;
  rpcErrors: number;
  graphqlRequests: number;
  graphqlErrors: number;
  cacheHits: number;
  lastError?: {
    type: string;
    message: string;
    timestamp: Date;
  };
  currentRpcIndex?: number;
  notifications: number;
}

export const SystemHealthMonitor: React.FC = () => {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<HealthMetrics>({
    rpcRequests: 0,
    rpcErrors: 0,
    graphqlRequests: 0,
    graphqlErrors: 0,
    cacheHits: 0,
    notifications: 0,
  });
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // 暫時禁用監控以避免無限循環
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // 使用 ref 來追踪已處理的查詢，避免重複計算
    const processedQueries = new Set<string>();
    
    // 監聽查詢事件
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated') {
        const query = event.query;
        const queryKey = query.queryKey;
        const queryHash = query.queryHash;
        
        // 避免重複處理同一個查詢
        if (processedQueries.has(queryHash)) {
          return;
        }
        
        // 只在查詢狀態真正改變時更新
        if (query.state.fetchStatus === 'idle' && query.state.status === 'success') {
          processedQueries.add(queryHash);
          
          setMetrics(prev => {
            const newMetrics = { ...prev };
            
            // 判斷查詢類型
            if (queryKey[0]?.toString().includes('contract')) {
              newMetrics.rpcRequests++;
            } else if (queryKey[0]?.toString().includes('graph')) {
              newMetrics.graphqlRequests++;
            }
            
            // 檢查快取命中
            if (query.state.dataUpdateCount === 0 && query.state.data) {
              newMetrics.cacheHits++;
            }
            
            return newMetrics;
          });
        }
        
        // 處理錯誤（但避免重複處理）
        if (query.state.status === 'error' && query.state.error && !processedQueries.has(queryHash + '_error')) {
          processedQueries.add(queryHash + '_error');
          
          setMetrics(prev => ({
            ...prev,
            lastError: {
              type: queryKey[0]?.toString().includes('contract') ? 'RPC' : 'GraphQL',
              message: query.state.error.message,
              timestamp: new Date()
            }
          }));
        }
      }
    });

    // 監聽通知事件
    const handleNotification = () => {
      setMetrics(prev => ({ ...prev, notifications: prev.notifications + 1 }));
    };
    
    window.addEventListener('marketplaceListingCreated', handleNotification);
    window.addEventListener('marketplaceListingSold', handleNotification);
    window.addEventListener('marketplaceListingCancelled', handleNotification);

    return () => {
      unsubscribe();
      window.removeEventListener('marketplaceListingCreated', handleNotification);
      window.removeEventListener('marketplaceListingSold', handleNotification);
      window.removeEventListener('marketplaceListingCancelled', handleNotification);
    };
  }, [queryClient]);

  // 計算成功率
  const rpcSuccessRate = metrics.rpcRequests > 0 
    ? ((metrics.rpcRequests - metrics.rpcErrors) / metrics.rpcRequests * 100).toFixed(1)
    : '100';
  
  const graphqlSuccessRate = metrics.graphqlRequests > 0
    ? ((metrics.graphqlRequests - metrics.graphqlErrors) / metrics.graphqlRequests * 100).toFixed(1)
    : '100';

  const cacheHitRate = (metrics.rpcRequests + metrics.graphqlRequests) > 0
    ? (metrics.cacheHits / (metrics.rpcRequests + metrics.graphqlRequests) * 100).toFixed(1)
    : '0';

  // 暫時禁用以避免無限循環
  return null;
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 bg-gray-900 border border-gray-700 rounded-lg shadow-lg transition-all ${
      isMinimized ? 'w-12 h-12' : 'w-80'
    }`}>
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-full h-full flex items-center justify-center text-gray-400 hover:text-white"
        >
          📊
        </button>
      ) : (
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              🏥 系統健康監控
              <span className={`w-2 h-2 rounded-full ${
                metrics.rpcErrors > 5 || metrics.graphqlErrors > 5 ? 'bg-red-500' : 'bg-green-500'
              } animate-pulse`} />
            </h3>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* RPC 狀態 */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">RPC 請求:</span>
              <span className="text-white">
                {metrics.rpcRequests} 
                <span className={`ml-2 ${metrics.rpcErrors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  ({rpcSuccessRate}% 成功)
                </span>
              </span>
            </div>

            {/* GraphQL 狀態 */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">GraphQL:</span>
              <span className="text-white">
                {metrics.graphqlRequests}
                <span className={`ml-2 ${metrics.graphqlErrors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  ({graphqlSuccessRate}% 成功)
                </span>
              </span>
            </div>

            {/* 快取命中率 */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">快取命中:</span>
              <span className="text-blue-400">{cacheHitRate}%</span>
            </div>

            {/* 通知數量 */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">通知事件:</span>
              <span className="text-purple-400">{metrics.notifications}</span>
            </div>

            {/* 最後錯誤 */}
            {metrics.lastError && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="text-red-400 font-semibold">最後錯誤:</div>
                <div className="text-gray-300 text-xs mt-1">
                  [{metrics.lastError.type}] {metrics.lastError.message.slice(0, 50)}...
                </div>
                <div className="text-gray-500 text-xs">
                  {formatDistanceToNow(metrics.lastError.timestamp, { 
                    addSuffix: true,
                    locale: zhTW 
                  })}
                </div>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setMetrics({
                  rpcRequests: 0,
                  rpcErrors: 0,
                  graphqlRequests: 0,
                  graphqlErrors: 0,
                  cacheHits: 0,
                  notifications: 0,
                })}
                className="flex-1 px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700"
              >
                重置統計
              </button>
              <button
                onClick={() => queryClient.clear()}
                className="flex-1 px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700"
              >
                清除快取
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};