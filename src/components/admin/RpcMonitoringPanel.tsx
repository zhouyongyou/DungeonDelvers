// src/components/admin/RpcMonitoringPanel.tsx - 管理員 RPC 監控面板

import React, { useState, useEffect } from 'react';
import { useRpcMonitoring, useRpcAnalytics, useRpcRealTimeMonitoring, useRpcAlerts } from '../../hooks/useRpcMonitoring';
import { rpcHealthManager } from '../../utils/rpcHealthCheck';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import RpcDashboard from '../ui/RpcDashboard';
import AdminSection from './AdminSection';
import { CacheRecommendation, OptimizationSuggestion } from '../../utils/rpcAnalytics';
import { productionMonitoring, ProductionReport } from '../../config/productionMonitoring';

const RpcMonitoringPanel: React.FC = () => {
  const { stats, insights, isLoading, clearStats, exportStats } = useRpcMonitoring();
  const { 
    isAnalyzing, 
    getCacheRecommendations, 
    getOptimizationSuggestions,
    detectBottlenecks,
    generatePerformanceReport 
  } = useRpcAnalytics();
  const { realtimeStats, requestHistory } = useRpcRealTimeMonitoring();
  const { alerts, thresholds, setThresholds, clearAllAlerts } = useRpcAlerts();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'health' | 'alerts' | 'settings'>('dashboard');
  const [cacheRecommendations, setCacheRecommendations] = useState<CacheRecommendation[]>([]);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Array<{ type: string; description: string; impact: string }>>([]);
  const [nodeStats, setNodeStats] = useState<any[]>([]);
  const [performanceReport, setPerformanceReport] = useState<string>('');

  // 定期更新節點狀態
  useEffect(() => {
    const updateNodeStats = () => {
      setNodeStats(rpcHealthManager.getNodeStats());
    };

    updateNodeStats();
    const interval = setInterval(updateNodeStats, 30000); // 每30秒更新
    return () => clearInterval(interval);
  }, []);

  // 生成分析報告
  const handleGenerateAnalysis = async () => {
    try {
      const [recommendations, suggestions, bottleneckData, report] = await Promise.all([
        getCacheRecommendations(),
        getOptimizationSuggestions(),
        detectBottlenecks(),
        generatePerformanceReport(),
      ]);

      setCacheRecommendations(recommendations);
      setOptimizationSuggestions(suggestions);
      setBottlenecks(bottleneckData);
      setPerformanceReport(report);
    } catch (error) {
      console.error('生成分析報告失敗:', error);
    }
  };

  // 導出完整報告
  const handleExportReport = () => {
    const reportData = {
      stats,
      insights,
      cacheRecommendations,
      optimizationSuggestions,
      bottlenecks,
      nodeStats,
      performanceReport,
      alerts,
      exportTime: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rpc-monitoring-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 獲取節點健康狀態顏色
  const getNodeHealthColor = (isHealthy: boolean, failureCount: number) => {
    if (!isHealthy) return 'text-red-400';
    if (failureCount > 0) return 'text-yellow-400';
    return 'text-green-400';
  };

  // 格式化延遲時間
  const formatLatency = (latency: number) => {
    if (latency === 0) return 'N/A';
    return `${latency}ms`;
  };

  // 獲取影響級別顏色
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  // 獲取優先級顏色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-900/20 text-red-400';
      case 'medium': return 'bg-yellow-900/20 text-yellow-400';
      case 'low': return 'bg-green-900/20 text-green-400';
      default: return 'bg-gray-900/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* 標題和控制按鈕 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">RPC 監控系統</h2>
        <div className="flex items-center gap-2">
          <ActionButton
            onClick={handleGenerateAnalysis}
            isLoading={isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? '分析中...' : '生成分析'}
          </ActionButton>
          <ActionButton
            onClick={handleExportReport}
            className="bg-green-600 hover:bg-green-700"
          >
            導出報告
          </ActionButton>
          <ActionButton
            onClick={clearStats}
            className="bg-red-600 hover:bg-red-700"
          >
            清除數據
          </ActionButton>
        </div>
      </div>

      {/* 實時狀態摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">當前請求/秒</h3>
          <div className="text-2xl font-bold text-blue-400">
            {realtimeStats.requestsPerSecond}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">平均響應時間</h3>
          <div className="text-2xl font-bold text-green-400">
            {realtimeStats.averageResponseTime.toFixed(0)}ms
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">實時錯誤率</h3>
          <div className="text-2xl font-bold text-red-400">
            {(realtimeStats.errorRate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">活動警報</h3>
          <div className="text-2xl font-bold text-yellow-400">
            {alerts.length}
          </div>
        </div>
      </div>

      {/* 標籤頁導航 */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {[
            { key: 'dashboard', label: '儀表板' },
            { key: 'analytics', label: '分析報告' },
            { key: 'health', label: '節點健康' },
            { key: 'alerts', label: '警報系統' },
            { key: 'settings', label: '設置' },
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
      <div className="space-y-6">
        {activeTab === 'dashboard' && (
          <div>
            <RpcDashboard showExportButton={false} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* 緩存建議 */}
            <AdminSection title="緩存優化建議">
              {cacheRecommendations.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  點擊 "生成分析" 來獲取緩存建議
                </div>
              ) : (
                <div className="space-y-3">
                  {cacheRecommendations.map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      rec.priority === 'high' ? 'border-red-500 bg-red-900/10' :
                      rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-900/10' :
                      'border-green-500 bg-green-900/10'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{rec.queryKey}</h4>
                          <p className="text-gray-300 text-sm mt-1">{rec.reason}</p>
                          <div className="mt-2 text-sm text-gray-400">
                            建議：staleTime={rec.recommendedStaleTime}ms, gcTime={rec.recommendedGcTime}ms
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(rec.priority)}`}>
                          {rec.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminSection>

            {/* 優化建議 */}
            <AdminSection title="性能優化建議">
              {optimizationSuggestions.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  點擊 "生成分析" 來獲取優化建議
                </div>
              ) : (
                <div className="space-y-3">
                  {optimizationSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-4 bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{suggestion.title}</h4>
                          <p className="text-gray-300 text-sm mt-1">{suggestion.description}</p>
                          <div className="mt-2 text-sm text-gray-400">
                            實施方案：{suggestion.implementation}
                          </div>
                          <div className="mt-2 flex gap-4 text-xs">
                            <span className={`${getImpactColor(suggestion.expectedImpact)}`}>
                              預期影響：{suggestion.expectedImpact}
                            </span>
                            <span className="text-gray-400">
                              實施難度：{suggestion.difficulty}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded bg-blue-900/20 text-blue-400`}>
                          {suggestion.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminSection>

            {/* 性能瓶頸 */}
            <AdminSection title="性能瓶頸分析">
              {bottlenecks.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  點擊 "生成分析" 來檢測性能瓶頸
                </div>
              ) : (
                <div className="space-y-3">
                  {bottlenecks.map((bottleneck, index) => (
                    <div key={index} className="p-4 bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{bottleneck.type}</h4>
                          <p className="text-gray-300 text-sm mt-1">{bottleneck.description}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          bottleneck.impact === 'high' ? 'bg-red-900/20 text-red-400' :
                          bottleneck.impact === 'medium' ? 'bg-yellow-900/20 text-yellow-400' :
                          'bg-green-900/20 text-green-400'
                        }`}>
                          {bottleneck.impact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminSection>

            {/* 詳細報告 */}
            {performanceReport && (
              <AdminSection title="詳細性能報告">
                <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap">
                  {performanceReport}
                </pre>
              </AdminSection>
            )}
          </div>
        )}

        {activeTab === 'health' && (
          <AdminSection title="RPC 節點健康狀態">
            <div className="space-y-4">
              {nodeStats.map((node, index) => (
                <div key={index} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{node.url}</h4>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">狀態：</span>
                          <span className={`ml-2 ${getNodeHealthColor(node.isHealthy, node.failureCount)}`}>
                            {node.isHealthy ? '健康' : '故障'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">延遲：</span>
                          <span className="ml-2 text-white">{formatLatency(node.latency)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">失敗次數：</span>
                          <span className="ml-2 text-white">{node.failureCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">最後檢查：</span>
                          <span className="ml-2 text-white">
                            {new Date(node.lastCheck).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      node.isHealthy ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          </AdminSection>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <AdminSection title="警報設置">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    最大請求數/分鐘
                  </label>
                  <input
                    type="number"
                    value={thresholds.maxRequestsPerMinute}
                    onChange={(e) => setThresholds(prev => ({ 
                      ...prev, 
                      maxRequestsPerMinute: parseInt(e.target.value) 
                    }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    最大響應時間 (ms)
                  </label>
                  <input
                    type="number"
                    value={thresholds.maxResponseTime}
                    onChange={(e) => setThresholds(prev => ({ 
                      ...prev, 
                      maxResponseTime: parseInt(e.target.value) 
                    }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    最大錯誤率
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={thresholds.maxErrorRate}
                    onChange={(e) => setThresholds(prev => ({ 
                      ...prev, 
                      maxErrorRate: parseFloat(e.target.value) 
                    }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              </div>
            </AdminSection>

            <AdminSection title="活動警報">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  當前警報 ({alerts.length})
                </h3>
                <ActionButton
                  onClick={clearAllAlerts}
                  className="bg-red-600 hover:bg-red-700"
                >
                  清除所有警報
                </ActionButton>
              </div>
              
              {alerts.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  暫無活動警報
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                      alert.type === 'error' ? 'border-red-500 bg-red-900/10' :
                      alert.type === 'warning' ? 'border-yellow-500 bg-yellow-900/10' :
                      'border-blue-500 bg-blue-900/10'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className={`font-semibold ${
                            alert.type === 'error' ? 'text-red-400' :
                            alert.type === 'warning' ? 'text-yellow-400' :
                            'text-blue-400'
                          }`}>
                            {alert.title}
                          </h4>
                          <p className="text-gray-300 text-sm mt-1">{alert.message}</p>
                          <p className="text-gray-400 text-xs mt-2">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setAlerts(prev => prev.filter(a => a.id !== alert.id));
                          }}
                          className="text-gray-400 hover:text-white ml-4"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminSection>
          </div>
        )}

        {activeTab === 'settings' && (
          <AdminSection title="監控設置">
            <div className="space-y-4">
              <div className="p-4 bg-gray-700 rounded-lg">
                <h4 className="font-semibold text-white mb-2">監控配置</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mr-2"
                    />
                    <span className="text-gray-300">啟用 RPC 監控</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mr-2"
                    />
                    <span className="text-gray-300">啟用性能分析</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mr-2"
                    />
                    <span className="text-gray-300">啟用警報系統</span>
                  </label>
                </div>
              </div>
            </div>
          </AdminSection>
        )}
      </div>
    </div>
  );
};

export default RpcMonitoringPanel;