// AltarHistoryStats.tsx - 升星歷史統計組件
import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { THE_GRAPH_API_URL } from '../../config/graphConfig';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface UpgradeRecord {
  id: string;
  timestamp: string;
  nftType: 'hero' | 'relic';
  fromRarity: number;
  toRarity: number;
  outcome: 'great_success' | 'success' | 'partial_fail' | 'total_fail';
  materialsUsed: number;
  nftsReceived: number;
}

interface AltarHistoryStatsProps {
  isOpen: boolean;
  onClose: () => void;
}

// GraphQL 查詢升星歷史 (暫時使用模擬數據，實際需要子圖支持)
const GET_UPGRADE_HISTORY = `
  query GetUpgradeHistory($player: String!) {
    upgradeEvents(
      where: { player: $player }
      orderBy: timestamp
      orderDirection: desc
      first: 100
    ) {
      id
      timestamp
      nftType
      fromRarity
      toRarity
      outcome
      materialsUsed
      nftsReceived
    }
  }
`;

export const AltarHistoryStats: React.FC<AltarHistoryStatsProps> = ({ isOpen, onClose }) => {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  // TODO: 實際從子圖查詢升星歷史數據
  const { data: upgradeHistory, isLoading } = useQuery({
    queryKey: ['altarHistory', address],
    queryFn: async (): Promise<UpgradeRecord[]> => {
      if (!address) return [];
      
      // 目前子圖尚未實作升星歷史查詢功能
      // 返回空數組，等待子圖支援後再實作
      return [];
      
      /* 未來實作時的參考代碼：
      try {
        const response = await fetch(THE_GRAPH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: GET_UPGRADE_HISTORY,
            variables: { player: address.toLowerCase() }
          })
        });
        
        const result = await response.json();
        return result.data?.upgradeEvents || [];
      } catch (error) {
        console.error('查詢升星歷史失敗:', error);
        return [];
      }
      */
    },
    enabled: !!address && isOpen,
    staleTime: 1000 * 60 * 5,
  });

  // 統計數據
  const stats = useMemo(() => {
    if (!upgradeHistory) return null;

    const totalUpgrades = upgradeHistory.length;
    const successfulUpgrades = upgradeHistory.filter(r => 
      r.outcome === 'success' || r.outcome === 'great_success'
    ).length;
    const greatSuccesses = upgradeHistory.filter(r => r.outcome === 'great_success').length;
    const totalMaterials = upgradeHistory.reduce((sum, r) => sum + r.materialsUsed, 0);
    const totalReceived = upgradeHistory.reduce((sum, r) => sum + r.nftsReceived, 0);

    const successRate = totalUpgrades > 0 ? (successfulUpgrades / totalUpgrades) * 100 : 0;
    const greatSuccessRate = totalUpgrades > 0 ? (greatSuccesses / totalUpgrades) * 100 : 0;

    const rarityStats = {
      1: upgradeHistory.filter(r => r.fromRarity === 1).length,
      2: upgradeHistory.filter(r => r.fromRarity === 2).length,
      3: upgradeHistory.filter(r => r.fromRarity === 3).length,
      4: upgradeHistory.filter(r => r.fromRarity === 4).length,
    };

    const typeStats = {
      hero: upgradeHistory.filter(r => r.nftType === 'hero').length,
      relic: upgradeHistory.filter(r => r.nftType === 'relic').length,
    };

    return {
      totalUpgrades,
      successfulUpgrades,
      greatSuccesses,
      totalMaterials,
      totalReceived,
      successRate,
      greatSuccessRate,
      rarityStats,
      typeStats
    };
  }, [upgradeHistory]);

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'great_success': return '⚜️';
      case 'success': return '✨';
      case 'partial_fail': return '💔';
      case 'total_fail': return '💀';
      default: return '❓';
    }
  };

  const getOutcomeText = (outcome: string) => {
    switch (outcome) {
      case 'great_success': return '神跡降臨';
      case 'success': return '祝福成功';
      case 'partial_fail': return '部分失敗';
      case 'total_fail': return '祭品消散';
      default: return '未知';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'great_success': return 'text-purple-400';
      case 'success': return 'text-green-400';
      case 'partial_fail': return 'text-yellow-400';
      case 'total_fail': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="升星統計"
      className="max-w-4xl max-h-[80vh] overflow-y-auto"
    >
      <div className="space-y-6">
        {/* 標籤切換 */}
        <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-md transition-all ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            📈 總覽統計
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-md transition-all ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            📜 升星記錄
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
            <span className="ml-3 text-gray-400">載入統計數據中...</span>
          </div>
        ) : !stats ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌟</div>
            <p className="text-gray-400 text-lg">還沒有升星記錄</p>
            <p className="text-gray-500 text-sm mt-2">開始您的第一次升星之旅吧！</p>
          </div>
        ) : (
          <>
            {/* 總覽統計 */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 核心數據卡片 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-300">{stats.totalUpgrades}</div>
                    <div className="text-sm text-blue-400">總升星次數</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 border border-green-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-300">{stats.successRate.toFixed(1)}%</div>
                    <div className="text-sm text-green-400">總成功率</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border border-purple-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-300">{stats.greatSuccesses}</div>
                    <div className="text-sm text-purple-400">神跡降臨</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-300">{stats.totalMaterials}</div>
                    <div className="text-sm text-yellow-400">消耗祭品</div>
                  </div>
                </div>

                {/* 詳細統計 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 星級分布 */}
                  <div className="bg-gray-800/50 border border-gray-600/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      ⭐ 升星分布
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(stats.rarityStats).map(([rarity, count]) => (
                        <div key={rarity} className="flex items-center justify-between">
                          <span className="text-gray-300">{rarity}★ → {parseInt(rarity) + 1}★</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full"
                                style={{ 
                                  width: `${stats.totalUpgrades > 0 ? (count / stats.totalUpgrades) * 100 : 0}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm text-gray-400 w-8">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NFT 類型分布 */}
                  <div className="bg-gray-800/50 border border-gray-600/20 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      🎭 類型分布
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">🦸 英雄升星</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                              style={{ 
                                width: `${stats.totalUpgrades > 0 ? (stats.typeStats.hero / stats.totalUpgrades) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-400 w-8">{stats.typeStats.hero}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">🏺 聖物升星</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                              style={{ 
                                width: `${stats.totalUpgrades > 0 ? (stats.typeStats.relic / stats.totalUpgrades) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-400 w-8">{stats.typeStats.relic}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 效率分析 */}
                <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    📊 效率分析
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-indigo-300">
                        {stats.totalUpgrades > 0 ? (stats.totalMaterials / stats.totalUpgrades).toFixed(1) : '0'}
                      </div>
                      <div className="text-sm text-indigo-400">平均消耗祭品</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-300">
                        {stats.totalUpgrades > 0 ? (stats.totalReceived / stats.totalUpgrades).toFixed(1) : '0'}
                      </div>
                      <div className="text-sm text-purple-400">平均獲得NFT</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-pink-300">
                        {stats.greatSuccessRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-pink-400">神跡觸發率</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 升星記錄 */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {upgradeHistory && upgradeHistory.length > 0 ? (
                  <div className="space-y-3">
                    {upgradeHistory.map((record) => (
                      <div
                        key={record.id}
                        className="bg-gray-800/50 border border-gray-600/20 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">
                              {getOutcomeIcon(record.outcome)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">
                                  {record.nftType === 'hero' ? '🦸 英雄' : '🏺 聖物'}
                                </span>
                                <span className="text-gray-400">
                                  {record.fromRarity}★ → {record.toRarity}★
                                </span>
                              </div>
                              <div className={`text-sm ${getOutcomeColor(record.outcome)}`}>
                                {getOutcomeText(record.outcome)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-gray-300">
                              消耗 {record.materialsUsed} 個祭品
                            </div>
                            <div className="text-sm text-gray-400">
                              {record.nftsReceived > 0 ? `獲得 ${record.nftsReceived} 個NFT` : '無收穫'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(record.timestamp).toLocaleDateString('zh-TW', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📜</div>
                    <p className="text-gray-400">暫無升星記錄</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 提示信息 */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-200">
            💡 <strong>數據說明：</strong>統計數據每 5 分鐘更新一次，包含您在此祭壇的所有升星活動記錄。
            數據來源於區塊鏈，完全透明可查。
          </p>
        </div>
      </div>
    </Modal>
  );
};