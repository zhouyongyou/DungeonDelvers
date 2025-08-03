// src/components/admin/RpcMonitoringPanel.tsx - 管理員 RPC 監控面板

import React, { useState, useEffect } from 'react';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import AdminSection from './AdminSection';
import { useAppToast } from '../../contexts/SimpleToastContext';

interface RpcHealthStats {
  status: string;
  timestamp: string;
  stats: {
    cache: {
      hits: number;
      misses: number;
      hitRate: string;
      size: number;
    };
    rateLimiter: {
      activeClients: number;
    };
    keyManager: {
      totalKeys: number;
      keys: Array<{
        index: number;
        requests: number;
        errors: number;
        errorRate: string;
        lastError?: string;
      }>;
    };
  };
  debug?: {
    url: string;
    method: string;
    hasKeys: boolean;
  };
}

const RpcMonitoringPanel: React.FC = () => {
  const { showToast } = useAppToast();
  const [healthData, setHealthData] = useState<RpcHealthStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'health' | 'links'>('dashboard');

  const fetchHealthData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 根據環境決定 API 端點
      const isProduction = window.location.hostname !== 'localhost';
      
      // 本地開發時返回模擬數據
      if (!isProduction) {
        setHealthData({
          status: 'development',
          timestamp: new Date().toISOString(),
          stats: {
            cache: {
              hits: 0,
              misses: 0,
              hitRate: '0%',
              size: 0
            },
            rateLimiter: {
              activeClients: 0
            },
            keyManager: {
              totalKeys: 3,
              keys: [
                { index: 0, requests: 0, errors: 0, errorRate: '0%' },
                { index: 1, requests: 0, errors: 0, errorRate: '0%' },
                { index: 2, requests: 0, errors: 0, errorRate: '0%' }
              ]
            }
          },
          debug: {
            url: 'localhost:5173',
            method: 'LOCAL',
            hasKeys: true
          }
        });
        showToast('本地開發模式 - 顯示模擬數據', 'info');
        return;
      }
      
      const apiUrl = '/api/rpc-optimized?health=true';
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchHealthData, 10000); // 每10秒刷新
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const testRpcRequest = async () => {
    setIsLoading(true);
    try {
      const isProduction = window.location.hostname !== 'localhost';
      
      // 本地開發時跳過 RPC 測試
      if (!isProduction) {
        showToast('本地開發模式 - RPC 測試已禁用', 'info');
        setIsLoading(false);
        return;
      }
      
      const apiUrl = '/api/rpc-optimized';
      
      const startTime = Date.now();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const cacheStatus = response.headers.get('x-cache') || 'UNKNOWN';
      
      const message = `RPC 測試成功！響應時間: ${responseTime}ms, 緩存: ${cacheStatus}, 區塊: ${parseInt(data.result, 16)}`;
      showToast(isProduction ? message : `[本地測試] ${message}`, 'success');
      
      // 刷新健康數據
      await fetchHealthData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知錯誤';
      showToast(`RPC 測試失敗: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* 快速連結和控制按鈕 */}
      <div className="flex flex-wrap gap-3">
        <ActionButton 
          onClick={fetchHealthData} 
          isLoading={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          刷新狀態
        </ActionButton>
        
        <ActionButton 
          onClick={testRpcRequest} 
          isLoading={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          測試 RPC
        </ActionButton>
        
        <ActionButton 
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={autoRefresh ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'}
        >
          {autoRefresh ? '停止自動刷新' : '開始自動刷新'}
        </ActionButton>
        
        <a 
          href="/api/rpc-optimized?health=true" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          🔗 查看原始數據
        </a>
      </div>

      {/* 錯誤顯示 */}
      {error && (
        <div className="bg-red-900/50 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
          <strong>錯誤：</strong>{error}
        </div>
      )}

      {/* 載入狀態 */}
      {isLoading && !healthData && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* 標籤頁導航 */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {[
            { key: 'dashboard', label: '儀表板' },
            { key: 'health', label: '健康狀態' },
            { key: 'links', label: '有用連結' },
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
        {activeTab === 'dashboard' && healthData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 系統狀態 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-green-400">系統狀態</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>狀態：</span>
                  <span className={healthData.status === 'healthy' ? 'text-green-400' : 'text-red-400'}>
                    {healthData.status === 'healthy' ? '✅ 健康' : '❌ 異常'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>更新時間：</span>
                  <span className="text-gray-300 text-sm">
                    {formatTimestamp(healthData.timestamp)}
                  </span>
                </div>
                {autoRefresh && (
                  <div className="text-yellow-400 text-sm">
                    🔄 自動刷新中 (每10秒)
                  </div>
                )}
              </div>
            </div>

            {/* 緩存統計 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">緩存統計</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>命中率：</span>
                  <span className="text-blue-300">{healthData.stats.cache.hitRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>命中次數：</span>
                  <span>{healthData.stats.cache.hits}</span>
                </div>
                <div className="flex justify-between">
                  <span>未命中：</span>
                  <span>{healthData.stats.cache.misses}</span>
                </div>
                <div className="flex justify-between">
                  <span>緩存條目：</span>
                  <span>{healthData.stats.cache.size}</span>
                </div>
              </div>
            </div>

            {/* 速率限制 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-yellow-400">速率限制</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>活躍客戶端：</span>
                  <span>{healthData.stats.rateLimiter.activeClients}</span>
                </div>
                <div className="text-sm text-gray-400">
                  限制：100 req/min/IP
                </div>
              </div>
            </div>

            {/* API Key 管理 */}
            <div className="bg-gray-800 rounded-lg p-4 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">API Key 狀態</h3>
              <div className="mb-3">
                <span>總共 {healthData.stats.keyManager.totalKeys} 個 API Key</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthData.stats.keyManager.keys.map((key) => (
                  <div key={key.index} className="bg-gray-700 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Key #{key.index}</span>
                      <span className={`text-sm ${key.errors === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {key.errors === 0 ? '✅' : '⚠️'}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>請求數：{key.requests}</div>
                      <div>錯誤數：{key.errors}</div>
                      <div>錯誤率：{key.errorRate}</div>
                      {key.lastError && (
                        <div className="text-red-400 text-xs">
                          上次錯誤：{formatTimestamp(key.lastError)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <AdminSection title="RPC 系統健康詳情">
            {healthData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">緩存性能</h4>
                    <div className="space-y-2 text-sm">
                      <div>命中率：{healthData.stats.cache.hitRate}</div>
                      <div>總請求：{healthData.stats.cache.hits + healthData.stats.cache.misses}</div>
                      <div>緩存大小：{healthData.stats.cache.size} 項目</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">流量控制</h4>
                    <div className="space-y-2 text-sm">
                      <div>活躍連接：{healthData.stats.rateLimiter.activeClients}</div>
                      <div>流量分配：100% 優化版本</div>
                      <div>限制策略：100 req/min/IP</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">API Key 健康狀況</h4>
                  <div className="text-sm text-gray-300">
                    <div>總 Key 數量：{healthData.stats.keyManager.totalKeys}</div>
                    <div>健康 Key 數量：{healthData.stats.keyManager.keys.filter(k => k.errors === 0).length}</div>
                    <div>總請求數：{healthData.stats.keyManager.keys.reduce((sum, k) => sum + k.requests, 0)}</div>
                    <div>總錯誤數：{healthData.stats.keyManager.keys.reduce((sum, k) => sum + k.errors, 0)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                點擊 "刷新狀態" 來載入健康數據
              </div>
            )}
          </AdminSection>
        )}

        {activeTab === 'links' && (
          <AdminSection title="RPC 監控相關連結">
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3">🔗 有用的連結</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                    <div>
                      <span className="text-gray-300 font-medium">健康檢查端點</span>
                      <div className="text-sm text-gray-400">即時查看 RPC 系統健康狀況</div>
                    </div>
                    <a 
                      href="/api/rpc-optimized?health=true" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      打開
                    </a>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                    <div>
                      <span className="text-gray-300 font-medium">RPC 優化端點</span>
                      <div className="text-sm text-gray-400">POST /api/rpc-optimized - 主要 RPC 代理</div>
                    </div>
                    <span className="px-3 py-1 bg-gray-600 text-gray-300 text-sm rounded">POST</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                    <div>
                      <span className="text-gray-300 font-medium">舊版 RPC 端點</span>
                      <div className="text-sm text-gray-400">POST /api/rpc - 備用端點（0% 流量）</div>
                    </div>
                    <span className="px-3 py-1 bg-gray-600 text-gray-300 text-sm rounded">POST</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3">📊 監控指標</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-gray-300 mb-2">緩存指標</h5>
                    <ul className="space-y-1 text-gray-400">
                      <li>• 緩存命中率 (目標 &gt; 60%)</li>
                      <li>• 響應時間 (緩存命中 &lt; 10ms)</li>
                      <li>• 緩存大小 (&lt; 1000 條目)</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-300 mb-2">性能指標</h5>
                    <ul className="space-y-1 text-gray-400">
                      <li>• API Key 錯誤率 (&lt; 5%)</li>
                      <li>• 速率限制觸發 (監控)</li>
                      <li>• 系統健康狀態</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3">⚡ 快速調試命令</h4>
                <div className="space-y-2">
                  <div className="bg-gray-900 p-3 rounded font-mono text-sm">
                    <div className="text-gray-400">健康檢查：</div>
                    <div className="text-green-400">curl /api/rpc-optimized?health=true</div>
                  </div>
                  <div className="bg-gray-900 p-3 rounded font-mono text-sm">
                    <div className="text-gray-400">測試 RPC 請求：</div>
                    <div className="text-green-400">curl -X POST /api/rpc-optimized -d '{`"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1`}'</div>
                  </div>
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