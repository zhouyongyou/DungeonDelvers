// src/components/leaderboards/LeaderboardsFixed.tsx
// 修復版本 - 使用實際可用的子圖數據

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatEther } from 'viem';
import { THE_GRAPH_API_URL, isGraphConfigured } from '../../config/graphConfig';

// 重新設計的 GraphQL 查詢 - 更有意義的排行榜
const LEADERBOARDS_QUERY = `
  query GetLeaderboards {
    # 隊伍戰力排行榜 - 前 10 名（保留，這個有意義）
    partyPowerLeaders: parties(
      first: 10
      orderBy: totalPower
      orderDirection: desc
      where: { totalPower_gt: "0" }
    ) {
      id
      tokenId
      totalPower
      partyRarity
      owner {
        id
        profile {
          name
        }
      }
    }
    
    # 遠征次數排行榜 - 最活躍的冒險者
    expeditionLeaders: players(
      first: 10
      orderBy: totalExpeditions
      orderDirection: desc
      where: { totalExpeditions_gt: 0 }
    ) {
      id
      profile {
        name
      }
      totalExpeditions
      successfulExpeditions
      totalRewardsEarned
      lastExpeditionAt
    }
    
    # 獎勵獲得排行榜 - 最富有的冒險者
    rewardLeaders: players(
      first: 10
      orderBy: totalRewardsEarned
      orderDirection: desc
      where: { totalRewardsEarned_gt: "0" }
    ) {
      id
      profile {
        name
      }
      totalRewardsEarned
      totalExpeditions
      successfulExpeditions
    }
    
    # 勝率排行榜 - 最技巧高超的冒險者（至少5次遠征）
    winRateLeaders: players(
      first: 10
      orderBy: winRate
      orderDirection: desc
      where: { 
        totalExpeditions_gte: 5
        winRate_gt: "0"
      }
    ) {
      id
      profile {
        name
      }
      totalExpeditions
      successfulExpeditions
      winRate
      totalRewardsEarned
    }
    
    # 升星大師排行榜 - 升星最多的玩家
    upgradeLeaders: players(
      first: 10
      orderBy: totalUpgrades
      orderDirection: desc
      where: { totalUpgrades_gt: 0 }
    ) {
      id
      profile {
        name
      }
      totalUpgrades
      successfulUpgrades
      upgradeSuccessRate
      totalUpgradeCost
    }
    
    # VIP 質押排行榜
    vipLeaders: vips(
      first: 10
      orderBy: stakedAmount
      orderDirection: desc
      where: { 
        stakedAmount_gt: "0"
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
      vipLevel
      stakedAt
    }
    
    # 最近活躍玩家
    recentActiveLeaders: expeditions(
      first: 50
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
      totalUpgrades
    }
  }
`;

interface LeaderboardData {
  partyPowerLeaders: Array<{
    id: string;
    tokenId: string;
    totalPower: string;
    partyRarity: number;
    owner: {
      id: string;
      profile?: { name: string };
    };
  }>;
  expeditionLeaders: Array<{
    id: string;
    profile?: { name: string };
    totalExpeditions: number;
    successfulExpeditions: number;
    totalRewardsEarned: string;
    lastExpeditionAt?: string;
  }>;
  rewardLeaders: Array<{
    id: string;
    profile?: { name: string };
    totalRewardsEarned: string;
    totalExpeditions: number;
    successfulExpeditions: number;
  }>;
  winRateLeaders: Array<{
    id: string;
    profile?: { name: string };
    totalExpeditions: number;
    successfulExpeditions: number;
    winRate: string;
    totalRewardsEarned: string;
  }>;
  upgradeLeaders: Array<{
    id: string;
    profile?: { name: string };
    totalUpgrades: number;
    successfulUpgrades: number;
    upgradeSuccessRate: string;
    totalUpgradeCost: string;
  }>;
  vipLeaders: Array<{
    id: string;
    owner: {
      id: string;
      profile?: { name: string };
    };
    stakedAmount: string;
    vipLevel: number;
    stakedAt: string;
  }>;
  recentActiveLeaders: Array<{
    id: string;
    player: {
      id: string;
      profile?: { name: string };
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
    totalUpgrades: number;
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

// 排行榜標籤 - 重新設計更有趣的類別
type LeaderboardTab = 'partypower' | 'expeditions' | 'rewards' | 'winrate' | 'upgrades' | 'vip' | 'active';

const LEADERBOARD_TABS: Array<{ id: LeaderboardTab; label: string; icon: string; description: string }> = [
  { id: 'partypower', label: '隊伍戰力', icon: '⚔️', description: '最強大的冒險隊伍' },
  { id: 'expeditions', label: '遠征次數', icon: '🗺️', description: '最活躍的冒險者' },
  { id: 'rewards', label: '財富排行', icon: '💰', description: '獲得最多獎勵的玩家' },
  { id: 'winrate', label: '勝率大師', icon: '🏆', description: '技巧最高超的冒險者' },
  { id: 'upgrades', label: '升星大師', icon: '⭐', description: '升星最成功的玩家' },
  { id: 'vip', label: 'VIP 質押', icon: '👑', description: '質押最多的尊貴玩家' },
  { id: 'active', label: '近期活躍', icon: '🔥', description: '最近7天最活躍的玩家' },
];

export const LeaderboardsFixed: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('partypower');

  const {
    data: leaderboardData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['leaderboards-fixed'],
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

  const renderPartyPowerLeaderboard = () => (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm mb-4">基於隊伍總戰力排名</p>
      {leaderboardData.partyPowerLeaders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暫無隊伍數據</p>
      ) : (
        leaderboardData.partyPowerLeaders.map((party, index) => (
          <div key={party.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
            <div className="flex items-center space-x-3">
              <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
              <div>
                <p className="text-white font-medium">
                  隊伍 #{party.tokenId} - {formatPlayerName(party.owner)}
                </p>
                <p className="text-gray-400 text-sm">
                  稀有度 {party.partyRarity} · 擁有者: {party.owner.id.slice(0, 8)}...
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-green-400 font-bold">{parseInt(party.totalPower).toLocaleString()}</p>
              <p className="text-gray-400 text-sm">總戰力</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderExpeditionLeaderboard = () => (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm mb-4">基於遠征次數排名，展現最活躍的冒險者</p>
      {leaderboardData.expeditionLeaders?.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暫無遠征數據</p>
      ) : (
        leaderboardData.expeditionLeaders?.map((player, index) => {
          const winRate = player.totalExpeditions > 0 ? (player.successfulExpeditions / player.totalExpeditions * 100) : 0;
          return (
            <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
                <div>
                  <p className="text-white font-medium">{formatPlayerName(player)}</p>
                  <p className="text-gray-400 text-sm">
                    勝率 {winRate.toFixed(1)}% · 獲得 {parseFloat(formatEther(BigInt(player.totalRewardsEarned))).toFixed(1)} SoulShard
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-400 font-bold">{player.totalExpeditions}</p>
                <p className="text-gray-400 text-sm">遠征次數</p>
                <p className="text-green-400 text-xs">{player.successfulExpeditions} 勝</p>
              </div>
            </div>
          );
        }) || []
      )}
    </div>
  );

  const renderRewardLeaderboard = () => (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm mb-4">基於總獎勵獲得量排名</p>
      {leaderboardData.rewardLeaders?.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暫無獎勵數據</p>
      ) : (
        leaderboardData.rewardLeaders?.map((player, index) => {
          const winRate = player.totalExpeditions > 0 ? (player.successfulExpeditions / player.totalExpeditions * 100) : 0;
          return (
            <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
                <div>
                  <p className="text-white font-medium">{formatPlayerName(player)}</p>
                  <p className="text-gray-400 text-sm">
                    {player.totalExpeditions} 次遠征 · 勝率 {winRate.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold">{parseFloat(formatEther(BigInt(player.totalRewardsEarned))).toFixed(1)}</p>
                <p className="text-gray-400 text-sm">SoulShard</p>
              </div>
            </div>
          );
        }) || []
      )}
    </div>
  );

  const renderWinRateLeaderboard = () => (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm mb-4">基於勝率排名（至少5次遠征）</p>
      {leaderboardData.winRateLeaders?.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暫無勝率數據</p>
      ) : (
        leaderboardData.winRateLeaders?.map((player, index) => {
          const winRate = parseFloat(player.winRate) * 100;
          return (
            <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
                <div>
                  <p className="text-white font-medium">{formatPlayerName(player)}</p>
                  <p className="text-gray-400 text-sm">
                    {player.successfulExpeditions}/{player.totalExpeditions} 勝 · 
                    獲得 {parseFloat(formatEther(BigInt(player.totalRewardsEarned))).toFixed(1)} SoulShard
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold">{winRate.toFixed(1)}%</p>
                <p className="text-gray-400 text-sm">勝率</p>
              </div>
            </div>
          );
        }) || []
      )}
    </div>
  );

  const renderUpgradeLeaderboard = () => (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm mb-4">基於升星成功次數排名</p>
      {leaderboardData.upgradeLeaders?.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暫無升星數據</p>
      ) : (
        leaderboardData.upgradeLeaders?.map((player, index) => {
          const successRate = parseFloat(player.upgradeSuccessRate) * 100;
          return (
            <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
                <div>
                  <p className="text-white font-medium">{formatPlayerName(player)}</p>
                  <p className="text-gray-400 text-sm">
                    成功率 {successRate.toFixed(1)}% · 
                    消費 {parseFloat(formatEther(BigInt(player.totalUpgradeCost))).toFixed(1)} SoulShard
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-orange-400 font-bold">{player.successfulUpgrades}</p>
                <p className="text-gray-400 text-sm">成功升星</p>
                <p className="text-gray-500 text-xs">{player.totalUpgrades} 嘗試</p>
              </div>
            </div>
          );
        }) || []
      )}
    </div>
  );

  const renderVIPLeaderboard = () => (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm mb-4">基於 VIP 質押金額排名</p>
      {leaderboardData.vipLeaders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暫無 VIP 數據</p>
      ) : (
        leaderboardData.vipLeaders.map((vip, index) => (
          <div key={vip.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
            <div className="flex items-center space-x-3">
              <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
              <div>
                <p className="text-white font-medium">{formatPlayerName(vip.owner)}</p>
                <p className="text-gray-400 text-sm">
                  VIP {vip.vipLevel} · 質押於 {new Date(parseInt(vip.stakedAt) * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-purple-400 font-bold">
                {(parseFloat(formatEther(BigInt(vip.stakedAmount))) / 1000000).toFixed(1)}M
              </p>
              <p className="text-gray-400 text-sm">SoulShard</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderActiveLeaderboard = () => {
    const activeLeaders = processActiveLeaders(leaderboardData.recentActiveLeaders);
    
    return (
      <div className="space-y-3">
        <p className="text-gray-400 text-sm mb-4">基於最近7天活躍度排名</p>
        {activeLeaders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暫無活躍數據</p>
        ) : (
          activeLeaders.map((player, index) => {
            const winRate = player.expeditions > 0 ? (player.successfulExpeditions / player.expeditions) * 100 : 0;
            return (
              <div key={player.player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
                  <div>
                    <p className="text-white font-medium">{formatPlayerName(player.player)}</p>
                    <p className="text-gray-400 text-sm">
                      勝率 {winRate.toFixed(1)}% · 上次活動 {new Date(player.lastActivity * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-orange-400 font-bold">{player.expeditions}</p>
                  <p className="text-gray-400 text-sm">7天遠征</p>
                  <p className="text-green-400 text-xs">+{parseFloat(formatEther(player.totalRewards)).toFixed(1)} SoulShard</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderLeaderboard = () => {
    switch (activeTab) {
      case 'partypower':
        return renderPartyPowerLeaderboard();
      case 'expeditions':
        return renderExpeditionLeaderboard();
      case 'rewards':
        return renderRewardLeaderboard();
      case 'winrate':
        return renderWinRateLeaderboard();
      case 'upgrades':
        return renderUpgradeLeaderboard();
      case 'vip':
        return renderVIPLeaderboard();
      case 'active':
        return renderActiveLeaderboard();
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
            <p>總玩家: {leaderboardData.globalStats.totalPlayers}</p>
            <p>總遠征: {leaderboardData.globalStats.totalExpeditions}</p>
            <p>成功率: {leaderboardData.globalStats.totalExpeditions > 0 ? 
                ((leaderboardData.globalStats.successfulExpeditions / leaderboardData.globalStats.totalExpeditions) * 100).toFixed(1) : 0}%</p>
          </div>
        )}
      </div>

      {/* 標籤切換 */}
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 bg-gray-700 p-1 rounded-lg">
          {LEADERBOARD_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
              className={`px-2 py-2 rounded-md text-xs font-medium transition-colors text-center ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              <div className="flex flex-col items-center">
                <span className="text-base mb-1">{tab.icon}</span>
                <span className="leading-tight">{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
        
        {/* 當前選中的排行榜描述 */}
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-400">
            {LEADERBOARD_TABS.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* 排行榜內容 */}
      <div className="min-h-[400px]">
        {renderLeaderboard()}
      </div>

      {/* 刷新提示 */}
      <div className="mt-4 text-center text-xs text-gray-500">
        每 30 秒自動刷新 · 數據來源: The Graph (修復版)
      </div>
    </div>
  );
});

LeaderboardsFixed.displayName = 'LeaderboardsFixed';