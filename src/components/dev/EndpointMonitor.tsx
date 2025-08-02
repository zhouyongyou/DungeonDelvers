import React, { useState, useEffect } from 'react';
import { subgraphConfig } from '../../config/subgraphConfig';
import { logger } from '../../utils/logger';

interface EndpointStatus {
  studio: {
    responseTime: number;
    lastCheck: number;
    isHealthy: boolean;
    status: 'healthy' | 'unhealthy';
  };
  decentralized: {
    responseTime: number;
    lastCheck: number;
    isHealthy: boolean;
    status: 'healthy' | 'unhealthy';
  };
  lastUpdated: number;
}

export const EndpointMonitor: React.FC = () => {
  const [status, setStatus] = useState<EndpointStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 只在開發環境或 debug 模式下顯示
    const shouldShow = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG === 'true';
    setIsVisible(shouldShow);

    if (!shouldShow) return;

    const updateStatus = () => {
      const currentStatus = subgraphConfig.getPerformanceStatus();
      setStatus(currentStatus);
    };

    // 立即更新一次
    updateStatus();

    // 每 10 秒更新一次
    const interval = setInterval(updateStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !status) return null;

  const formatTime = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatResponseTime = (time: number) => {
    if (time >= 9999) return 'Timeout';
    return `${time}ms`;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg text-xs max-w-xs z-50">
      <div className="font-semibold mb-2 flex items-center">
        <span className="mr-2">📊 GraphQL Endpoints</span>
        <button
          onClick={() => logger.info('Endpoint Status:', status)}
          className="text-blue-400 hover:text-blue-300"
          title="Log to console"
        >
          📋
        </button>
      </div>
      
      <div className="space-y-2">
        {/* Studio Endpoint */}
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span 
              className={`w-2 h-2 rounded-full mr-2 ${
                status.studio.isHealthy ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            Studio
          </span>
          <span className="text-gray-300">
            {formatResponseTime(status.studio.responseTime)}
          </span>
        </div>

        {/* Decentralized Endpoint */}
        <div className="flex items-center justify-between">
          <span className="flex items-center">
            <span 
              className={`w-2 h-2 rounded-full mr-2 ${
                status.decentralized.isHealthy ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            Network
          </span>
          <span className="text-gray-300">
            {formatResponseTime(status.decentralized.responseTime)}
          </span>
        </div>

        {/* Last Check */}
        <div className="text-gray-400 text-[10px] border-t pt-1">
          Last check: {formatTime(status.lastUpdated)}
        </div>

        {/* Current Optimal */}
        <div className="text-blue-300 text-[10px]">
          Optimal: {status.studio.responseTime <= status.decentralized.responseTime ? 'Studio' : 'Network'}
        </div>
      </div>
    </div>
  );
};

export default EndpointMonitor;