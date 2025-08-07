// RPC 狀態監控面板
import React, { useState, useEffect } from 'react';
import { getRPCStatus, getCurrentRPC } from '../../config/rpc-manager';

interface RPCEndpoint {
  key: string;
  priority: number;
  failures: number;
  responseTime?: number;
  available: boolean;
}

interface RPCStatus {
  current: {
    key?: string;
    url?: string;
    failures?: number;
    responseTime?: number;
  };
  endpoints: RPCEndpoint[];
}

export const RPCStatusPanel: React.FC = () => {
  const [status, setStatus] = useState<RPCStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshStatus = () => {
    setIsRefreshing(true);
    try {
      const currentStatus = getRPCStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('獲取 RPC 狀態失敗:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 30000); // 30秒刷新一次
    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-2">🔗 RPC 狀態監控</h3>
        <div className="text-gray-400">載入中...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">🔗 Alchemy RPC 狀態監控</h3>
        <button
          onClick={refreshStatus}
          disabled={isRefreshing}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {isRefreshing ? '刷新中...' : '刷新狀態'}
        </button>
      </div>

      {/* 當前使用的端點 */}
      <div className="mb-4 p-3 bg-gray-700 rounded">
        <div className="text-sm text-gray-300 mb-1">🎯 當前端點</div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          <span className="text-white font-mono text-sm">
            {status.current.key?.slice(0, 8)}...
          </span>
          {status.current.responseTime && (
            <span className="text-green-400 text-xs">
              {status.current.responseTime}ms
            </span>
          )}
          <span className="text-gray-400 text-xs">
            失敗: {status.current.failures || 0}
          </span>
        </div>
      </div>

      {/* 所有端點狀態 */}
      <div>
        <div className="text-sm text-gray-300 mb-2">📊 所有端點狀態</div>
        <div className="space-y-2">
          {status.endpoints.map((endpoint, index) => (
            <div 
              key={endpoint.key} 
              className={`flex items-center justify-between p-2 rounded text-sm ${
                endpoint.available 
                  ? 'bg-gray-700 border-l-4 border-green-400' 
                  : 'bg-gray-900 border-l-4 border-red-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span 
                  className={`w-2 h-2 rounded-full ${
                    endpoint.available ? 'bg-green-400' : 'bg-red-400'
                  }`}
                ></span>
                <span className="font-mono text-white">
                  #{endpoint.priority} {endpoint.key}
                </span>
              </div>
              
              <div className="flex items-center space-x-3 text-xs">
                {endpoint.responseTime && (
                  <span className="text-green-400">
                    {endpoint.responseTime}ms
                  </span>
                )}
                <span className="text-gray-400">
                  失敗: {endpoint.failures}
                </span>
                <span className={`px-2 py-1 rounded ${
                  endpoint.available 
                    ? 'bg-green-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}>
                  {endpoint.available ? '可用' : '不可用'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 使用說明 */}
      <div className="mt-4 p-2 bg-blue-900 bg-opacity-50 rounded text-xs text-blue-200">
        💡 系統會自動選擇響應最快且可用的端點。失敗次數達到 3 次的端點會被暫時排除，1分鐘後重新啟用。
      </div>
    </div>
  );
};