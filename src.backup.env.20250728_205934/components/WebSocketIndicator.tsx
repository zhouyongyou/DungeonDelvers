// WebSocketIndicator.tsx - WebSocket 連接狀態指示器

import React, { useEffect, useState } from 'react';
import { connectionStatus } from '../config/apolloClient';

export const WebSocketIndicator: React.FC = () => {
  const [isConnected, setIsConnected] = useState(connectionStatus.isConnected);
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    return connectionStatus.subscribe(setIsConnected);
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
          isConnected
            ? 'bg-green-900/80 hover:bg-green-800/80 text-green-300'
            : 'bg-yellow-900/80 hover:bg-yellow-800/80 text-yellow-300'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-400' : 'bg-yellow-400'
        } ${!isConnected && 'animate-pulse'}`} />
        <span className="text-sm font-medium">
          {isConnected ? '即時更新' : '輪詢模式'}
        </span>
      </button>
      
      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 p-3 bg-gray-800 rounded-lg shadow-xl border border-gray-700 min-w-[200px]">
          <h4 className="text-sm font-semibold text-white mb-2">連接狀態</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">WebSocket:</span>
              <span className={isConnected ? 'text-green-400' : 'text-yellow-400'}>
                {isConnected ? '已連接' : '已斷開'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">更新方式:</span>
              <span className="text-gray-300">
                {isConnected ? '即時推送' : '10秒輪詢'}
              </span>
            </div>
            {!isConnected && (
              <p className="text-yellow-400 mt-2">
                WebSocket 連接失敗，已降級到輪詢模式
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};