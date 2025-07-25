// src/components/admin/ContractHealthPanel.tsx - 合約健康狀態監控面板

import React, { useState, useEffect } from 'react';
import { contractChecker } from '../../utils/contractChecker';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import AdminSection from './AdminSection';

interface ContractHealth {
  soulShardToken: string;
  soulShardTokenSet: boolean;
  dungeonCoreAddress: string;
  dungeonCoreSet: boolean;
  dungeonStorageAddress: string;
  dungeonStorageSet: boolean;
  isPaused: boolean;
  provisionPriceUSD: string;
  dungeonMasterAddress: string;
  allChecksPass: boolean;
  issues: string[];
}

const ContractHealthPanel: React.FC = () => {
  const [health, setHealth] = useState<ContractHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await contractChecker.runFullCheck();
      setHealth(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '檢查失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const formatAddress = (address: string) => {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return '未設置';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusIcon = (isSet: boolean) => {
    return isSet ? '✅' : '❌';
  };

  const getStatusText = (isSet: boolean) => {
    return isSet ? '正常' : '異常';
  };

  if (loading) {
    return (
      <AdminSection title="🔗 合約連接狀態" defaultExpanded={false}>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </AdminSection>
    );
  }

  if (error) {
    return (
      <AdminSection title="🔗 合約連接狀態" defaultExpanded={false}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-800">
            <span className="text-xl mr-2">⚠️</span>
            <span className="font-medium">檢查失敗</span>
          </div>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={checkHealth}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            重新檢查
          </button>
        </div>
      </AdminSection>
    );
  }

  if (!health) return null;

  return (
    <AdminSection title="🔗 合約連接狀態" defaultExpanded={false}>
      <div className="space-y-4">
        {/* 整體狀態 */}
        <div className={`p-4 rounded-lg border ${
          health.allChecksPass 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">
                {health.allChecksPass ? '✅' : '❌'}
              </span>
              <div>
                <h3 className={`font-semibold ${
                  health.allChecksPass ? 'text-green-800' : 'text-red-800'
                }`}>
                  {health.allChecksPass ? '系統健康' : '發現問題'}
                </h3>
                <p className={`text-sm ${
                  health.allChecksPass ? 'text-green-600' : 'text-red-600'
                }`}>
                  {health.allChecksPass 
                    ? '所有合約連接正常' 
                    : `發現 ${health.issues.length} 個問題`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={checkHealth}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              重新檢查
            </button>
          </div>
        </div>

        {/* 問題列表 */}
        {health.issues.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ 需要注意的問題：</h4>
            <ul className="space-y-1">
              {health.issues.map((issue, index) => (
                <li key={index} className="text-yellow-700 text-sm">
                  • {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 詳細狀態 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DungeonMaster 資訊 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">📋 DungeonMaster 狀態</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>合約地址:</span>
                <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                  {formatAddress(health.dungeonMasterAddress)}
                </code>
              </div>
              <div className="flex justify-between">
                <span>暫停狀態:</span>
                <span className={health.isPaused ? 'text-red-600' : 'text-green-600'}>
                  {health.isPaused ? '⏸️ 已暫停' : '▶️ 運行中'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>儲備價格:</span>
                <span>{health.provisionPriceUSD} USD</span>
              </div>
            </div>
          </div>

          {/* 連接狀態 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">🔗 合約連接</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>SoulShard Token:</span>
                <div className="flex items-center">
                  <span className="mr-2">{getStatusIcon(health.soulShardTokenSet)}</span>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                    {formatAddress(health.soulShardToken)}
                  </code>
                </div>
              </div>
              <div className="flex justify-between">
                <span>DungeonCore:</span>
                <div className="flex items-center">
                  <span className="mr-2">{getStatusIcon(health.dungeonCoreSet)}</span>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                    {formatAddress(health.dungeonCoreAddress)}
                  </code>
                </div>
              </div>
              <div className="flex justify-between">
                <span>DungeonStorage:</span>
                <div className="flex items-center">
                  <span className="mr-2">{getStatusIcon(health.dungeonStorageSet)}</span>
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                    {formatAddress(health.dungeonStorageAddress)}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作建議 */}
        {!health.allChecksPass && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">🛠️ 建議的修復步驟：</h4>
            <div className="text-blue-700 text-sm space-y-1">
              {!health.soulShardTokenSet && (
                <p>• 執行 DungeonMaster.setSoulShardToken() 設置代幣地址</p>
              )}
              {!health.dungeonCoreSet && (
                <p>• 執行 DungeonMaster.setDungeonCore() 設置核心合約地址</p>
              )}
              {!health.dungeonStorageSet && (
                <p>• 執行 DungeonMaster.setDungeonStorage() 設置存儲合約地址</p>
              )}
              {health.isPaused && (
                <p>• 執行 DungeonMaster.unpause() 恢復合約運行</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminSection>
  );
};

export default ContractHealthPanel;