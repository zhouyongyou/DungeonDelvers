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

// 排行榜標籤
type LeaderboardTab = 'power' | 'rewards' | 'expeditions' | 'vip';

const LEADERBOARD_TABS: Array<{ id: LeaderboardTab; label: string; icon: string }> = [
  { id: 'power', label: '戰力排行', icon: '⚔️' },
  { id: 'rewards', label: '獎勵排行', icon: '💰' },
  { id: 'expeditions', label: '遠征排行', icon: '🗺️' },
  { id: 'vip', label: 'VIP 排行', icon: '👑' },
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

  const renderLeaderboard = () => {
    switch (activeTab) {
      case 'power':
        return renderPowerLeaderboard();
      case 'rewards':
        return renderRewardsLeaderboard();
      case 'expeditions':
        return renderExpeditionsLeaderboard();
      case 'vip':
        return renderVIPLeaderboard();
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
      <div className="flex space-x-1 mb-6 bg-gray-700 p-1 rounded-lg">
        {LEADERBOARD_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
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