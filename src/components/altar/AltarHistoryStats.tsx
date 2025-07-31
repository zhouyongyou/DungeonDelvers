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
  type: 'hero' | 'relic';
  baseRarity: number;
  newRarity: number;
  outcome: number; // 0: great_success, 1: success, 2: partial_fail, 3: total_fail
  isSuccess: boolean;
  burnedTokenIds: string[];
  mintedTokenIds: string[];
}

interface AltarHistoryStatsProps {
  isOpen: boolean;
  onClose: () => void;
}

// GraphQL 查詢升星歷史 (使用實際的 UpgradeAttempt 實體)
const GET_UPGRADE_HISTORY = `
  query GetUpgradeHistory($player: String!) {
    upgradeAttempts(
      where: { player: $player }
      orderBy: timestamp
      orderDirection: desc
      first: 100
    ) {
      id
      type
      baseRarity
      newRarity
      outcome
      isSuccess
      burnedTokenIds
      mintedTokenIds
      timestamp
    }
  }
`;

export const AltarHistoryStats: React.FC<AltarHistoryStatsProps> = ({ isOpen, onClose }) => {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  // 從子圖查詢升星歷史數據
  const { data: upgradeHistory, isLoading } = useQuery({
    queryKey: ['altarHistory', address],
    queryFn: async (): Promise<UpgradeRecord[]> => {
      if (!address || !THE_GRAPH_API_URL) return [];
      
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
        
        if (result.errors) {
          console.error('查詢升星歷史出錯:', result.errors);
          return [];
        }
        
        return result.data?.upgradeAttempts || [];
      } catch (error) {
        console.error('查詢升星歷史失敗:', error);
        return [];
      }
    },
    enabled: !!address && !!THE_GRAPH_API_URL && isOpen,
    staleTime: 1000 * 30, // 30秒刷新一次，更頻繁更新
    refetchInterval: 1000 * 60, // 每分鐘自動刷新
    refetchOnWindowFocus: true, // 重新聚焦時刷新
  });

  // 統計數據
  const stats = useMemo(() => {
    if (!upgradeHistory) return null;

    const totalUpgrades = upgradeHistory.length;
    const successfulUpgrades = upgradeHistory.filter(r => r.isSuccess).length;
    const greatSuccesses = upgradeHistory.filter(r => r.outcome === 3).length; // outcome 3 = great_success
    const totalMaterials = upgradeHistory.reduce((sum, r) => sum + r.burnedTokenIds.length, 0);
    const totalReceived = upgradeHistory.reduce((sum, r) => sum + r.mintedTokenIds.length, 0);

    const successRate = totalUpgrades > 0 ? (successfulUpgrades / totalUpgrades) * 100 : 0;
    const greatSuccessRate = totalUpgrades > 0 ? (greatSuccesses / totalUpgrades) * 100 : 0;

    const rarityStats = {
      1: upgradeHistory.filter(r => r.baseRarity === 1).length,
      2: upgradeHistory.filter(r => r.baseRarity === 2).length,
      3: upgradeHistory.filter(r => r.baseRarity === 3).length,
      4: upgradeHistory.filter(r => r.baseRarity === 4).length,
    };

    const typeStats = {
      hero: upgradeHistory.filter(r => r.type === 'hero').length,
      relic: upgradeHistory.filter(r => r.type === 'relic').length,
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

  const getOutcomeIcon = (outcome: number) => {
    switch (outcome) {
      case 3: return '⚜️'; // great_success
      case 2: return '✨'; // success
      case 1: return '💔'; // partial_fail
      case 0: return '💀'; // total_fail
      default: return '❓';
    }
  };

  const getOutcomeText = (outcome: number) => {
    switch (outcome) {
      case 3: return '神跡降臨'; // great_success
      case 2: return '祝福成功'; // success
      case 1: return '部分失敗'; // partial_fail
      case 0: return '祭品消散'; // total_fail
      default: return '未知';
    }
  };

  const getOutcomeColor = (outcome: number) => {
    switch (outcome) {
      case 3: return 'text-purple-400'; // great_success
      case 2: return 'text-green-400'; // success
      case 1: return 'text-yellow-400'; // partial_fail
      case 0: return 'text-red-400'; // total_fail
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

                {/* 升星分布 - 緊湊排列 */}
                <div className="bg-gray-800/50 border border-gray-600/20 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    ⭐ 升星分布
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(stats.rarityStats).map(([rarity, count]) => (
                      <div key={rarity} className="text-center">
                        <div className="text-sm text-gray-400 mb-1">{rarity}★ → {parseInt(rarity) + 1}★</div>
                        <div className="text-xl font-bold text-purple-300">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 類型分布 - 緊湊排列 */}
                <div className="bg-gray-800/50 border border-gray-600/20 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    🎭 類型分布
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-1">🦸 英雄升星</div>
                      <div className="text-xl font-bold text-blue-300">{stats.typeStats.hero}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-1">🏺 聖物升星</div>
                      <div className="text-xl font-bold text-amber-300">{stats.typeStats.relic}</div>
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
                                  {record.type === 'hero' ? '🦸 英雄' : '🏺 聖物'}
                                </span>
                                <span className="text-gray-400">
                                  {record.baseRarity}★ → {record.newRarity || record.baseRarity + 1}★
                                </span>
                              </div>
                              <div className={`text-sm ${getOutcomeColor(record.outcome)}`}>
                                {getOutcomeText(record.outcome)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-gray-300">
                              消耗 {record.burnedTokenIds.length} 個祭品
                            </div>
                            <div className="text-sm text-gray-400">
                              {record.mintedTokenIds.length > 0 ? `獲得 ${record.mintedTokenIds.length} 個NFT` : '無收穫'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(parseInt(record.timestamp) * 1000).toLocaleDateString('zh-TW', {
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