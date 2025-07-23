// src/components/debug/PerformanceDashboard.tsx - 性能監控儀表板

import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../../utils/performanceMonitor';

interface PerformanceStats {
  summary: Record<string, { avg: number; max: number; count: number; unit: string }>;
  metrics: Array<{
    name: string;
    value: number;
    timestamp: number;
    category: string;
    unit: string;
  }>;
  recommendations: string[];
}

const PerformanceDashboard: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      const report = performanceMonitor.getPerformanceReport();
      setStats(report);
    };

    // 初始載入
    updateStats();

    // TEMP_DISABLED: 暫時禁用性能監控更新輪詢以避免 RPC 過載
    // const interval = setInterval(updateStats, 5000);
    // return () => clearInterval(interval);
  }, []);

  // 只在開發環境顯示
  if (import.meta.env.PROD) {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          性能監控
        </button>
      </div>
    );
  }

  const getStatusColor = (name: string, value: number): string => {
    switch (name) {
      case 'LCP':
        return value > 2500 ? 'text-red-400' : value > 1500 ? 'text-yellow-400' : 'text-green-400';
      case 'FID':
        return value > 100 ? 'text-red-400' : value > 50 ? 'text-yellow-400' : 'text-green-400';
      case 'CLS':
        return value > 0.1 ? 'text-red-400' : value > 0.05 ? 'text-yellow-400' : 'text-green-400';
      case 'page-load':
        return value > 3000 ? 'text-red-400' : value > 2000 ? 'text-yellow-400' : 'text-green-400';
      case 'memory-used':
        return value > 50 ? 'text-red-400' : value > 25 ? 'text-yellow-400' : 'text-green-400';
      default:
        return 'text-gray-300';
    }
  };

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'ms') {
      return `${Math.round(value)}ms`;
    } else if (unit === 'mb') {
      return `${value.toFixed(1)}MB`;
    } else if (unit === 'count') {
      return value.toFixed(3);
    } else if (unit === 'percentage') {
      return `${Math.round(value)}%`;
    }
    return value.toString();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-800 rounded-lg shadow-lg p-4 max-w-md w-full max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold">性能監控</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {stats && (
        <div className="space-y-3">
          {/* 核心指標 */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">核心指標</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(stats.summary).map(([name, stat]) => (
                <div key={name} className="bg-gray-700 rounded p-2">
                  <div className="text-gray-400">{name}</div>
                  <div className={`font-mono ${getStatusColor(name, stat.avg)}`}>
                    {formatValue(stat.avg, stat.unit)}
                  </div>
                  <div className="text-gray-500">
                    最大: {formatValue(stat.max, stat.unit)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 最近的指標 */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">最近指標</h4>
            <div className="space-y-1 text-xs max-h-24 overflow-y-auto">
              {stats.metrics.slice(-5).reverse().map((metric, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-400">{metric.name}</span>
                  <span className={`font-mono ${getStatusColor(metric.name, metric.value)}`}>
                    {formatValue(metric.value, metric.unit)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 建議 */}
          {stats.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">優化建議</h4>
              <div className="space-y-1 text-xs">
                {stats.recommendations.map((rec, index) => (
                  <div key={index} className="text-yellow-400 bg-yellow-900/20 rounded p-2">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const report = performanceMonitor.getPerformanceReport();
                console.log('性能報告:', report);
              }}
              className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
            >
              導出報告
            </button>
            <button
              onClick={() => {
                performanceMonitor.cleanup();
                setStats(null);
              }}
              className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
            >
              清理數據
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;