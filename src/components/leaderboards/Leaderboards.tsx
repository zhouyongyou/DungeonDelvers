// src/components/leaderboards/Leaderboards.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatEther } from 'viem';
import { THE_GRAPH_API_URL, isGraphConfigured } from '../../config/graphConfig';

// GraphQL 查詢
const LEADERBOARDS_QUERY = `
  query GetLeaderboards {
    # 戰力排行榜 - 前 10 名
    powerLeaders: playerStats(
      first: 10
      orderBy: highestPartyPower
      orderDirection: desc
      where: { highestPartyPower_gt: "0" }
    ) {
      id
      player {
        id
        profile {
          name
        }
      }
      highestPartyPower
      totalExpeditions
      successfulExpeditions
    }
    
    # 獎勵排行榜 - 前 10 名
    rewardLeaders: playerStats(
      first: 10
      orderBy: totalRewardsEarned
      orderDirection: desc
      where: { totalRewardsEarned_gt: "0" }
    ) {
      id
      player {
        id
        profile {
          name
        }
      }
      totalRewardsEarned
      totalExpeditions
      successfulExpeditions
    }
    
    # 遠征次數排行榜 - 前 10 名
    expeditionLeaders: playerStats(
      first: 10
      orderBy: totalExpeditions
      orderDirection: desc
      where: { totalExpeditions_gt: 0 }
    ) {
      id
      player {
        id
        profile {
          name
        }
      }
      totalExpeditions
      successfulExpeditions
      totalRewardsEarned
    }
    
    # VIP 質押排行榜 - 前 10 名
    vipLeaders: vips(
      first: 10
      orderBy: stakedAmount
      orderDirection: desc
      where: { 
        stakedAmount_gt: "0"
        isUnlocking: false 
      }
    ) {
      id
      owner {
        id
        profile {
          name
        }
      }
      stakedAmount
      stakedAt
    }
    
    # 最近遠征活動 - 前 20 名
    recentExpeditions: expeditions(
      first: 20
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      player {
        id
        profile {
          name
        }
      }
      party {
        name
        totalPower
      }
      dungeonName
      success
      reward
      timestamp
    }
    
    # 升星成功率排行榜 - 前 10 名（至少嘗試 5 次）
    upgradeLeaders: playerUpgradeStats(
      first: 10
      orderBy: totalAttempts
      orderDirection: desc
      where: { totalAttempts_gte: "5" }
    ) {
      id
      totalAttempts
      totalMinted
      totalBurned
      totalFeesSpent
    }
    
    # 消費排行榜 - 前 10 名（總消費最多的玩家）
    spendingLeaders: playerUpgradeStats(
      first: 10
      orderBy: totalFeesSpent
      orderDirection: desc
      where: { totalFeesSpent_gt: "0" }
    ) {
      id
      totalFeesSpent
      totalAttempts
      totalMinted
      totalBurned
    }
    
    # 勝率排行榜 - 前 10 名（至少 10 次遠征）
    winRateLeaders: playerStats(
      first: 10
      orderBy: successfulExpeditions
      orderDirection: desc
      where: { 
        totalExpeditions_gte: 10
        successfulExpeditions_gt: 0
      }
    ) {
      id
      player {
        id
        profile {
          name
        }
      }
      totalExpeditions
      successfulExpeditions
      totalRewardsEarned
      highestPartyPower
    }
    
    # 最近 7 天活躍玩家 - 前 10 名
    recentActiveLeaders: expeditions(
      first: 200
      orderBy: timestamp
      orderDirection: desc
      where: { 
        timestamp_gte: "${Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)}"
      }
    ) {
      id
      player {
        id
        profile {
          name
        }
      }
      success
      reward
      timestamp
    }
    
    # 全局統計
    globalStats(id: "global") {
      totalPlayers
      totalExpeditions
      successfulExpeditions
      totalRewardsDistributed
    }
  }
`;

interface LeaderboardData {
  powerLeaders: Array<{
    id: string;
    player: {
      id: string;
      profile?: {
        name: string;
      };
    };
    highestPartyPower: string;
    totalExpeditions: number;
    successfulExpeditions: number;
  }>;
  rewardLeaders: Array<{
    id: string;
    player: {
      id: string;
      profile?: {
        name: string;
      };
    };
    totalRewardsEarned: string;
    totalExpeditions: number;
    successfulExpeditions: number;
  }>;
  expeditionLeaders: Array<{
    id: string;
    player: {
      id: string;
      profile?: {
        name: string;
      };
    };
    totalExpeditions: number;
    successfulExpeditions: number;
    totalRewardsEarned: string;
  }>;
  vipLeaders: Array<{
    id: string;
    owner: {
      id: string;
      profile?: {
        name: string;
      };
    };
    stakedAmount: string;
    stakedAt: string;
  }>;
  recentExpeditions: Array<{
    id: string;
    player: {
      id: string;
      profile?: {
        name: string;
      };
    };
    party: {
      name: string;
      totalPower: string;
    };
    dungeonName: string;
    success: boolean;
    reward: string;
    timestamp: string;
  }>;
  upgradeLeaders: Array<{
    id: string;
    totalAttempts: string;
    totalMinted: string;
    totalBurned: string;
    totalFeesSpent: string;
  }>;
  spendingLeaders: Array<{
    id: string;
    totalFeesSpent: string;
    totalAttempts: string;
    totalMinted: string;
    totalBurned: string;
  }>;
  winRateLeaders: Array<{
    id: string;
    player: {
      id: string;
      profile?: {
        name: string;
      };
    };
    totalExpeditions: number;
    successfulExpeditions: number;
    totalRewardsEarned: string;
    highestPartyPower: string;
  }>;
  recentActiveLeaders: Array<{
    id: string;
    player: {
      id: string;
      profile?: {
        name: string;
      };
    };
    success: boolean;
    reward: string;
    timestamp: string;
  }>;
  globalStats?: {
    totalPlayers: number;
    totalExpeditions: number;
    successfulExpeditions: number;
    totalRewardsDistributed: string;
  };
}

// 獲取排行榜數據
async function fetchLeaderboards(): Promise<LeaderboardData | null> {
  if (!isGraphConfigured()) {
    console.warn('[Leaderboards] The Graph is not configured');
    return null;
  }

  try {
    const response = await fetch(THE_GRAPH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: LEADERBOARDS_QUERY,
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('[Leaderboards] GraphQL errors:', result.errors);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[Leaderboards] Fetch error:', error);
    return null;
  }
}

// 格式化玩家名稱
function formatPlayerName(player: { id: string; profile?: { name: string } }): string {
  if (player.profile?.name) {
    return player.profile.name;
  }
  return `${player.id.slice(0, 6)}...${player.id.slice(-4)}`;
}

// 計算成功率
function calculateSuccessRate(successful: number, total: number): string {
  if (total === 0) return '0%';
  return `${((successful / total) * 100).toFixed(1)}%`;
}

// 處理活躍玩家數據
function processActiveLeaders(expeditions: LeaderboardData['recentActiveLeaders']) {
  const playerStats = new Map<string, {
    player: { id: string; profile?: { name: string } };
    expeditions: number;
    successfulExpeditions: number;
    totalRewards: bigint;
    lastActivity: number;
  }>();

  expeditions.forEach(expedition => {
    const playerId = expedition.player.id;
    const existing = playerStats.get(playerId) || {
      player: expedition.player,
      expeditions: 0,
      successfulExpeditions: 0,
      totalRewards: 0n,
      lastActivity: 0
    };

    existing.expeditions++;
    if (expedition.success) {
      existing.successfulExpeditions++;
      existing.totalRewards += BigInt(expedition.reward);
    }
    existing.lastActivity = Math.max(existing.lastActivity, parseInt(expedition.timestamp));
    
    playerStats.set(playerId, existing);
  });

  return Array.from(playerStats.values())
    .sort((a, b) => b.expeditions - a.expeditions)
    .slice(0, 10);
}

// 排行榜標籤
type LeaderboardTab = 'power' | 'rewards' | 'expeditions' | 'vip' | 'recent' | 'upgrades' | 'spending' | 'winrate' | 'active';

const LEADERBOARD_TABS: Array<{ id: LeaderboardTab; label: string; icon: string }> = [
  { id: 'power', label: '戰力排行', icon: '⚔️' },
  { id: 'rewards', label: '獎勵排行', icon: '💰' },
  { id: 'expeditions', label: '遠征排行', icon: '🗺️' },
  { id: 'upgrades', label: '升星排行', icon: '⭐' },
  { id: 'spending', label: '消費排行', icon: '💎' },
  { id: 'winrate', label: '勝率排行', icon: '🏆' },
  { id: 'vip', label: 'VIP 排行', icon: '👑' },
  { id: 'active', label: '活躍排行', icon: '🔥' },
  { id: 'recent', label: '最近活動', icon: '📊' },
];

export const Leaderboards: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('power');

  const {
    data: leaderboardData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['leaderboards'],
    queryFn: fetchLeaderboards,
    refetchInterval: 30000, // 30 秒刷新一次
    staleTime: 20000, // 20 秒內認為數據是新鮮的
  });

  if (!isGraphConfigured()) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">🏆 排行榜</h2>
        <p className="text-gray-400">The Graph 配置未完成，排行榜功能暫不可用</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">🏆 排行榜</h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !leaderboardData) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">🏆 排行榜</h2>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">載入排行榜數據失敗</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  const renderPowerLeaderboard = () => (
    <div className="space-y-3">
      {leaderboardData.powerLeaders.map((player, index) => (
        <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
            <div>
              <p className="text-white font-medium">{formatPlayerName(player.player)}</p>
              <p className="text-gray-400 text-sm">
                遠征 {player.totalExpeditions} 次 · 成功率 {calculateSuccessRate(player.successfulExpeditions, player.totalExpeditions)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-green-400 font-bold">{parseInt(player.highestPartyPower).toLocaleString()}</p>
            <p className="text-gray-400 text-sm">戰力</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderRewardsLeaderboard = () => (
    <div className="space-y-3">
      {leaderboardData.rewardLeaders.map((player, index) => (
        <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
            <div>
              <p className="text-white font-medium">{formatPlayerName(player.player)}</p>
              <p className="text-gray-400 text-sm">
                遠征 {player.totalExpeditions} 次 · 成功率 {calculateSuccessRate(player.successfulExpeditions, player.totalExpeditions)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-green-400 font-bold">{parseFloat(formatEther(BigInt(player.totalRewardsEarned))).toFixed(2)}</p>
            <p className="text-gray-400 text-sm">SoulShard</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderExpeditionsLeaderboard = () => (
    <div className="space-y-3">
      {leaderboardData.expeditionLeaders.map((player, index) => (
        <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
            <div>
              <p className="text-white font-medium">{formatPlayerName(player.player)}</p>
              <p className="text-gray-400 text-sm">
                獲得 {parseFloat(formatEther(BigInt(player.totalRewardsEarned))).toFixed(2)} SoulShard
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-400 font-bold">{player.totalExpeditions}</p>
            <p className="text-gray-400 text-sm">遠征次數</p>
            <p className="text-green-400 text-xs">{calculateSuccessRate(player.successfulExpeditions, player.totalExpeditions)} 成功率</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderVIPLeaderboard = () => (
    <div className="space-y-3">
      {leaderboardData.vipLeaders.map((vip, index) => (
        <div key={vip.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
            <div>
              <p className="text-white font-medium">{formatPlayerName(vip.owner)}</p>
              <p className="text-gray-400 text-sm">
                質押於 {new Date(parseInt(vip.stakedAt) * 1000).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-purple-400 font-bold">{parseFloat(formatEther(BigInt(vip.stakedAmount))).toFixed(0)}</p>
            <p className="text-gray-400 text-sm">USDT</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderRecentActivityLeaderboard = () => (
    <div className="space-y-3">
      {leaderboardData.recentExpeditions.map((expedition, index) => (
        <div key={expedition.id} className="bg-gray-700 p-3 rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${expedition.success ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <p className="text-white font-medium">{formatPlayerName(expedition.player)}</p>
              <span className={`text-xs px-2 py-1 rounded ${expedition.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                {expedition.success ? '成功' : '失敗'}
              </span>
            </div>
            <span className="text-gray-400 text-xs">
              {new Date(parseInt(expedition.timestamp) * 1000).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div>
              <p className="text-gray-300">地城: <span className="text-blue-400">{expedition.dungeonName}</span></p>
              <p className="text-gray-300">隊伍: <span className="text-purple-400">{expedition.party.name}</span> (戰力: {parseInt(expedition.party.totalPower).toLocaleString()})</p>
            </div>
            {expedition.success && (
              <div className="text-right">
                <p className="text-green-400 font-bold">+{parseFloat(formatEther(BigInt(expedition.reward))).toFixed(2)}</p>
                <p className="text-gray-400 text-xs">SoulShard</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderUpgradeLeaderboard = () => (
    <div className="space-y-3">
      {leaderboardData.upgradeLeaders.map((player, index) => {
        const totalAttempts = parseInt(player.totalAttempts);
        const totalMinted = parseInt(player.totalMinted);
        const totalBurned = parseInt(player.totalBurned);
        const successRate = totalAttempts > 0 ? (totalMinted / totalAttempts) * 100 : 0;
        
        return (
          <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
            <div className="flex items-center space-x-3">
              <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
              <div>
                <p className="text-white font-medium">{`${player.id.slice(0, 6)}...${player.id.slice(-4)}`}</p>
                <p className="text-gray-400 text-sm">
                  成功率 {successRate.toFixed(1)}% · 消耗 {parseFloat(formatEther(BigInt(player.totalFeesSpent))).toFixed(1)} SoulShard
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-orange-400 font-bold">{totalAttempts}</p>
              <p className="text-gray-400 text-sm">升星次數</p>
              <div className="flex space-x-2 text-xs mt-1">
                <span className="text-green-400">+{totalMinted}</span>
                <span className="text-red-400">-{totalBurned}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // 消費排行榜
  const renderSpendingLeaderboard = () => (
    <div className="space-y-3">
      {leaderboardData.spendingLeaders.map((player, index) => {
        const totalSpent = parseFloat(formatEther(BigInt(player.totalFeesSpent)));
        const totalAttempts = parseInt(player.totalAttempts);
        const avgSpend = totalAttempts > 0 ? totalSpent / totalAttempts : 0;
        
        return (
          <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
            <div className="flex items-center space-x-3">
              <span className="text-lg font-bold text-purple-400">#{index + 1}</span>
              <div>
                <p className="text-white font-medium">{`${player.id.slice(0, 6)}...${player.id.slice(-4)}`}</p>
                <p className="text-gray-400 text-sm">
                  {totalAttempts} 次升星 · 平均 {avgSpend.toFixed(2)} SoulShard/次
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-purple-400 font-bold">{totalSpent.toFixed(1)}</p>
              <p className="text-gray-400 text-sm">總消費 SoulShard</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  // 勝率排行榜
  const renderWinRateLeaderboard = () => (
    <div className="space-y-3">
      {leaderboardData.winRateLeaders.map((player, index) => {
        const winRate = (player.successfulExpeditions / player.totalExpeditions) * 100;
        
        return (
          <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
            <div className="flex items-center space-x-3">
              <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
              <div>
                <p className="text-white font-medium">{formatPlayerName(player.player)}</p>
                <p className="text-gray-400 text-sm">
                  {player.successfulExpeditions}/{player.totalExpeditions} 勝 · 戰力 {parseInt(player.highestPartyPower).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-yellow-400 font-bold">{winRate.toFixed(1)}%</p>
              <p className="text-gray-400 text-sm">勝率</p>
              <p className="text-green-400 text-xs">+{parseFloat(formatEther(BigInt(player.totalRewardsEarned))).toFixed(1)} SoulShard</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  // 活躍排行榜
  const renderActiveLeaderboard = () => {
    const activeLeaders = processActiveLeaders(leaderboardData.recentActiveLeaders);
    
    return (
      <div className="space-y-3">
        {activeLeaders.map((player, index) => {
          const winRate = player.expeditions > 0 ? (player.successfulExpeditions / player.expeditions) * 100 : 0;
          
          return (
            <div key={player.player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-orange-400">#{index + 1}</span>
                <div>
                  <p className="text-white font-medium">{formatPlayerName(player.player)}</p>
                  <p className="text-gray-400 text-sm">
                    勝率 {winRate.toFixed(1)}% · 上次活動 {new Date(player.lastActivity * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-orange-400 font-bold">{player.expeditions}</p>
                <p className="text-gray-400 text-sm">7天遠征次數</p>
                <p className="text-green-400 text-xs">+{parseFloat(formatEther(player.totalRewards)).toFixed(1)} SoulShard</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLeaderboard = () => {
    switch (activeTab) {
      case 'power':
        return renderPowerLeaderboard();
      case 'rewards':
        return renderRewardsLeaderboard();
      case 'expeditions':
        return renderExpeditionsLeaderboard();
      case 'upgrades':
        return renderUpgradeLeaderboard();
      case 'spending':
        return renderSpendingLeaderboard();
      case 'winrate':
        return renderWinRateLeaderboard();
      case 'vip':
        return renderVIPLeaderboard();
      case 'active':
        return renderActiveLeaderboard();
      case 'recent':
        return renderRecentActivityLeaderboard();
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">🏆 排行榜</h2>
        {leaderboardData.globalStats && (
          <div className="text-right text-sm text-gray-400">
            <p>總玩家數: {leaderboardData.globalStats.totalPlayers}</p>
            <p>遠征成功率: {calculateSuccessRate(leaderboardData.globalStats.successfulExpeditions, leaderboardData.globalStats.totalExpeditions)}</p>
          </div>
        )}
      </div>

      {/* 標籤切換 */}
      <div className="mb-6">
        <div className="grid grid-cols-3 md:grid-cols-9 gap-1 bg-gray-700 p-1 rounded-lg">
          {LEADERBOARD_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-2 rounded-md text-xs font-medium transition-colors text-center ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              <div className="flex flex-col items-center">
                <span className="text-lg mb-1">{tab.icon}</span>
                <span className="leading-tight">{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 排行榜內容 */}
      <div className="min-h-[400px]">
        {renderLeaderboard()}
      </div>

      {/* 刷新提示 */}
      <div className="mt-4 text-center text-xs text-gray-500">
        每 30 秒自動刷新 · 數據來源: The Graph
      </div>
    </div>
  );
});

Leaderboards.displayName = 'Leaderboards';