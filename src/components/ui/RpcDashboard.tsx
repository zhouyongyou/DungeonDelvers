// src/components/ui/RpcDashboard.tsx - RPC 監控用戶儀表板

import React, { useState, useEffect } from 'react';
import { rpcMonitor } from '../../utils/rpcMonitor';
import type { RpcStats, PerformanceInsight } from '../../utils/rpcMonitor';
import { rpcAnalytics } from '../../utils/rpcAnalytics';
import { ActionButton } from './ActionButton';
import { LoadingSpinner } from './LoadingSpinner';

interface RpcDashboardProps {
  className?: string;
  showExportButton?: boolean;
  compact?: boolean;
}

const RpcDashboard: React.FC<RpcDashboardProps> = ({ 
  className = '', 
  showExportButton = true,
  compact = false 
}) => {
  const [stats, setStats] = useState<RpcStats | null>(null);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'usage' | 'insights'>('overview');

  // 定期更新統計數據
  useEffect(() => {
    const updateStats = () => {
      setStats(rpcMonitor.getStats());
      setInsights(rpcMonitor.getInsights());
      setIsLoading(false);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // 每5秒更新

    return () => clearInterval(interval);
  }, []);

  // 導出統計數據
  const handleExport = () => {
    const data = rpcMonitor.exportStats();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rpc-stats-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 清除統計數據
  const handleClear = () => {
    if (confirm('確定要清除所有 RPC 統計數據嗎？')) {
      rpcMonitor.clearStats();
      setStats(rpcMonitor.getStats());
      setInsights([]);
    }
  };

  // 格式化數字
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // 格式化時間
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // 獲取性能等級顏色
  const getPerformanceColor = (responseTime: number): string => {
    if (responseTime < 300) return 'text-green-400';
    if (responseTime < 600) return 'text-yellow-400';
    if (responseTime < 1200) return 'text-orange-400';
    return 'text-red-400';
  };

  // 獲取洞察類型顏色
  const getInsightColor = (type: string): string => {
    switch (type) {
      case 'error': return 'text-red-400 bg-red-900/20';
      case 'warning': return 'text-yellow-400 bg-yellow-900/20';
      case 'info': return 'text-blue-400 bg-blue-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center p-8 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`p-4 text-center text-gray-400 ${className}`}>
        沒有 RPC 統計數據
      </div>
    );
  }

  // 緊湊模式
  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">RPC 狀態</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-300">監控中</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {formatNumber(stats.totalRequests)}
            </div>
            <div className="text-xs text-gray-400">總請求</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${getPerformanceColor(stats.averageResponseTime)}`}>
              {formatTime(stats.averageResponseTime)}
            </div>
            <div className="text-xs text-gray-400">平均響應</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">
              {((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">成功率</div>
          </div>
        </div>
        
        {insights.length > 0 && (
          <div className="mt-4 p-2 bg-gray-700 rounded text-sm">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⚠️</span>
              <span className="text-gray-300">
                {insights[0].title}: {insights[0].description}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 完整模式
  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* 標題和控制按鈕 */}
      <div className="flex justify-between items-center p-6 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">RPC 監控面板</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-300">實時監控</span>
          </div>
          {showExportButton && (
            <>
              <ActionButton
                onClick={handleExport}
                className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1"
              >
                導出
              </ActionButton>
              <ActionButton
                onClick={handleClear}
                className="bg-red-600 hover:bg-red-700 text-sm px-3 py-1"
              >
                清除
              </ActionButton>
            </>
          )}
        </div>
      </div>

      {/* 標籤頁 */}
      <div className="flex border-b border-gray-700">
        {[
          { key: 'overview', label: '概覽' },
          { key: 'performance', label: '性能' },
          { key: 'usage', label: '使用情況' },
          { key: 'insights', label: '洞察' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 內容區域 */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 核心指標 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {formatNumber(stats.totalRequests)}
                </div>
                <div className="text-sm text-gray-400">總請求數</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-400">
                  {formatNumber(stats.successfulRequests)}
                </div>
                <div className="text-sm text-gray-400">成功請求</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-400">
                  {formatNumber(stats.failedRequests)}
                </div>
                <div className="text-sm text-gray-400">失敗請求</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <div className={`text-2xl font-bold ${getPerformanceColor(stats.averageResponseTime)}`}>
                  {formatTime(stats.averageResponseTime)}
                </div>
                <div className="text-sm text-gray-400">平均響應時間</div>
              </div>
            </div>

            {/* 成功率和錯誤率 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-2">成功率</h4>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-600 rounded-full h-2 mr-4">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(stats.successfulRequests / stats.totalRequests) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-green-400 font-bold">
                    {((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-2">錯誤率</h4>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-600 rounded-full h-2 mr-4">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(stats.failedRequests / stats.totalRequests) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-red-400 font-bold">
                    {((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* 性能等級 */}
            <div className="bg-gray-700 p-4 rounded-lg text-center">
              <h4 className="text-lg font-semibold text-white mb-2">性能等級</h4>
              <div className={`text-4xl font-bold ${getPerformanceColor(stats.averageResponseTime)}`}>
                {stats.averageResponseTime < 300 ? 'A' : 
                 stats.averageResponseTime < 600 ? 'B' : 
                 stats.averageResponseTime < 1200 ? 'C' : 
                 stats.averageResponseTime < 2400 ? 'D' : 'F'}
              </div>
              <div className="text-sm text-gray-400 mt-2">
                基於平均響應時間 {formatTime(stats.averageResponseTime)}
              </div>
            </div>

            {/* 響應時間趨勢 */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-4">24小時請求分布</h4>
              <div className="flex items-end gap-1 h-32">
                {stats.hourlyRequests.map((count, hour) => (
                  <div key={hour} className="flex-1 flex flex-col items-center">
                    <div 
                      className="bg-blue-500 w-full rounded-t transition-all duration-300"
                      style={{ 
                        height: `${Math.max(4, (count / Math.max(...stats.hourlyRequests)) * 100)}%` 
                      }}
                      title={`${hour}:00 - ${count} 個請求`}
                    ></div>
                    <div className="text-xs text-gray-400 mt-1">
                      {hour}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-6">
            {/* 最活躍的方法 */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-4">最頻繁的方法</h4>
              <div className="space-y-2">
                {Object.entries(stats.requestsByMethod)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([method, count]) => (
                    <div key={method} className="flex justify-between items-center">
                      <span className="text-gray-300">{method}</span>
                      <span className="text-blue-400 font-bold">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 最活躍的合約 */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-4">最活躍的合約</h4>
              <div className="space-y-2">
                {Object.entries(stats.requestsByContract)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([contract, count]) => (
                    <div key={contract} className="flex justify-between items-center">
                      <span className="text-gray-300">{contract}</span>
                      <span className="text-green-400 font-bold">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 最活躍的頁面 */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-4">最活躍的頁面</h4>
              <div className="space-y-2">
                {Object.entries(stats.requestsByPage)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([page, count]) => (
                    <div key={page} className="flex justify-between items-center">
                      <span className="text-gray-300">{page}</span>
                      <span className="text-purple-400 font-bold">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            {insights.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                暫無性能洞察
              </div>
            ) : (
              insights.map((insight, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'error' ? 'border-red-500 bg-red-900/10' :
                  insight.type === 'warning' ? 'border-yellow-500 bg-yellow-900/10' :
                  'border-blue-500 bg-blue-900/10'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-semibold ${
                        insight.type === 'error' ? 'text-red-400' :
                        insight.type === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                        {insight.title}
                      </h4>
                      <p className="text-gray-300 mt-1">{insight.description}</p>
                      <p className="text-gray-400 text-sm mt-2">
                        💡 建議：{insight.suggestion}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(insight.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RpcDashboard;