// src/pages/RpcStatsPage.tsx - 獨立的 RPC 統計頁面

import React, { useState, useEffect } from 'react';
import { useRpcMonitoring, useRpcAnalytics } from '../hooks/useRpcMonitoring';
import { rpcOptimizer, AutoOptimization } from '../utils/rpcOptimizer';
import RpcDashboard from '../components/ui/RpcDashboard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppToast } from '../hooks/useAppToast';

const RpcStatsPage: React.FC = () => {
  const { stats, insights, isLoading, clearStats, exportStats } = useRpcMonitoring();
  const { 
    isAnalyzing, 
    generatePerformanceReport, 
    getCacheRecommendations,
    getOptimizationSuggestions 
  } = useRpcAnalytics();
  const { showToast } = useAppToast();

  const [optimizations, setOptimizations] = useState<AutoOptimization[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'optimizations' | 'analysis'>('overview');
  const [reportData, setReportData] = useState<string>('');

  // 定期更新優化建議
  useEffect(() => {
    const updateOptimizations = () => {
      setOptimizations(rpcOptimizer.getOptimizations());
    };

    updateOptimizations();
    const interval = setInterval(updateOptimizations, 10000); // 每10秒更新
    return () => clearInterval(interval);
  }, []);

  // 應用優化建議
  const handleApplyOptimization = async (optimizationId: string) => {
    try {
      const success = await rpcOptimizer.applyOptimization(optimizationId);
      if (success) {
        showToast('優化建議已應用', 'success');
        setOptimizations(rpcOptimizer.getOptimizations());
      } else {
        showToast('應用優化失敗', 'error');
      }
    } catch (error) {
      showToast('應用優化時發生錯誤', 'error');
    }
  };

  // 生成分析報告
  const handleGenerateReport = async () => {
    try {
      const report = await generatePerformanceReport();
      setReportData(report);
      showToast('分析報告已生成', 'success');
    } catch (error) {
      showToast('生成報告失敗', 'error');
    }
  };

  // 獲取優化類型顏色
  const getOptimizationTypeColor = (type: string) => {
    switch (type) {
      case 'cache': return 'bg-blue-900/20 text-blue-400';
      case 'retry': return 'bg-yellow-900/20 text-yellow-400';
      case 'batch': return 'bg-green-900/20 text-green-400';
      case 'timeout': return 'bg-purple-900/20 text-purple-400';
      default: return 'bg-gray-900/20 text-gray-400';
    }
  };

  // 獲取影響級別顏色
  const getImpactColor = (impact: number) => {
    if (impact >= 50) return 'text-green-400';
    if (impact >= 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">RPC 統計分析</h1>
        <div className="flex items-center gap-2">
          <ActionButton
            onClick={handleGenerateReport}
            isLoading={isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? '生成中...' : '生成報告'}
          </ActionButton>
          <ActionButton
            onClick={() => {
              const data = exportStats();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `rpc-stats-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            導出數據
          </ActionButton>
        </div>
      </div>

      {/* 快速統計 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">
              {stats.totalRequests.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">總請求數</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              {stats.averageResponseTime.toFixed(0)}ms
            </div>
            <div className="text-sm text-gray-400">平均響應時間</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">
              {((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">成功率</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">
              {optimizations.length}
            </div>
            <div className="text-sm text-gray-400">優化建議</div>
          </div>
        </div>
      )}

      {/* 標籤頁 */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: '概覽' },
            { key: 'optimizations', label: '優化建議' },
            { key: 'analysis', label: '分析報告' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 內容區域 */}
      <div>
        {activeTab === 'overview' && (
          <RpcDashboard className="w-full" />
        )}

        {activeTab === 'optimizations' && (
          <div className="space-y-6">
            {/* 優化建議標題 */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                智能優化建議 ({optimizations.length})
              </h2>
              <ActionButton
                onClick={() => {
                  rpcOptimizer.clearOptimizations();
                  setOptimizations([]);
                  showToast('已清除所有優化建議', 'success');
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                清除建議
              </ActionButton>
            </div>

            {/* 優化建議列表 */}
            {optimizations.length === 0 ? (
              <EmptyState message="暫無優化建議，系統正在分析中..." />
            ) : (
              <div className="space-y-4">
                {optimizations.map((optimization) => (
                  <div
                    key={optimization.id}
                    className="bg-gray-800 p-6 rounded-lg border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {optimization.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded ${getOptimizationTypeColor(optimization.type)}`}>
                            {optimization.type}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-3">{optimization.description}</p>
                        <div className="text-sm text-gray-400 mb-3">
                          {optimization.reasoning}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400">
                            預期改進：
                            <span className={`ml-1 font-semibold ${getImpactColor(optimization.estimatedImpact)}`}>
                              {optimization.estimatedImpact.toFixed(0)}%
                            </span>
                          </span>
                          <span className="text-gray-400">
                            時間：{new Date(optimization.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!optimization.autoApply && (
                          <ActionButton
                            onClick={() => handleApplyOptimization(optimization.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            應用
                          </ActionButton>
                        )}
                        {optimization.autoApply && (
                          <div className="text-green-400 text-sm">
                            ✓ 已應用
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 配置變更詳情 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700">
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">當前配置</h4>
                        <pre className="bg-gray-900 p-3 rounded text-xs text-gray-300 overflow-x-auto">
                          {JSON.stringify(optimization.oldValue, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">建議配置</h4>
                        <pre className="bg-gray-900 p-3 rounded text-xs text-green-300 overflow-x-auto">
                          {JSON.stringify(optimization.newValue, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">詳細分析報告</h2>
              {reportData && (
                <ActionButton
                  onClick={() => {
                    const blob = new Blob([reportData], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `rpc-analysis-${new Date().toISOString().split('T')[0]}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  下載報告
                </ActionButton>
              )}
            </div>

            {reportData ? (
              <div className="bg-gray-800 p-6 rounded-lg">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                  {reportData}
                </pre>
              </div>
            ) : (
              <EmptyState message="點擊 '生成報告' 來生成詳細分析報告" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RpcStatsPage;