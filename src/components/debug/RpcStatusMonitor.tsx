// src/components/debug/RpcStatusMonitor.tsx - RPC 狀態監控組件

import React, { useState, useEffect } from 'react';
import { rpcHealthManager } from '../../utils/rpcHealthCheck';
import { logger } from '../../utils/logger';

export const RpcStatusMonitor: React.FC = () => {
  const [nodeStats, setNodeStats] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 只在開發環境顯示
    if (import.meta.env.PROD) return;

    const updateStats = () => {
      setNodeStats(rpcHealthManager.getNodeStats());
    };

    // 初始更新
    updateStats();

    // TEMP_DISABLED: 暫時禁用狀態更新輪詢以避免 RPC 過載
    // const interval = setInterval(updateStats, 5000);
    // return () => clearInterval(interval);
  }, []);

  // 只在開發環境渲染
  if (import.meta.env.PROD) return null;

  return (
    <>
      {/* 浮動按鈕 */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="RPC 狀態監控"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </button>

      {/* 監控面板 */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 w-96 max-h-96 overflow-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-semibold">RPC 節點狀態</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {nodeStats.map((node, index) => (
              <div
                key={index}
                className={`p-2 rounded text-sm ${
                  node.isHealthy ? 'bg-green-900/20' : 'bg-red-900/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-mono text-xs text-gray-400 break-all">
                      {node.url.replace('https://', '')}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs">
                      <span className={node.isHealthy ? 'text-green-400' : 'text-red-400'}>
                        {node.isHealthy ? '✓ 健康' : '✗ 異常'}
                      </span>
                      <span className="text-gray-400">
                        延遲: {node.latency}ms
                      </span>
                      {node.failureCount > 0 && (
                        <span className="text-orange-400">
                          失敗: {node.failureCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
            <div>健康節點: {nodeStats.filter(n => n.isHealthy).length}/{nodeStats.length}</div>
            <div>更新時間: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      )}
    </>
  );
};