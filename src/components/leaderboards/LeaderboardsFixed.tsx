// src/components/leaderboards/LeaderboardsFixed.tsx
// 修復版本 - 使用實際可用的子圖數據

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatEther } from 'viem';
import { THE_GRAPH_API_URL, isGraphConfigured } from '../../config/graphConfig';

// 簡化的 GraphQL 查詢 - 只使用確定存在的字段
const LEADERBOARDS_QUERY = `
  query GetLeaderboards {
    # 隊伍戰力排行榜 - 前 10 名
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
      }
    }
    
    # 英雄戰力排行榜 - 前 10 名（保留為對比）
    heroPowerLeaders: heros(
      first: 10
      orderBy: power
      orderDirection: desc
      where: { power_gt: "0" }
    ) {
      id
      tokenId
      power
      rarity
      owner {
        id
      }
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
      }
      stakedAmount
      stakedAt
    }
    
    # 最近遠征活動
    recentExpeditions: expeditions(
      first: 20
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      player {
        id
      }
      party {
        tokenId
        totalPower
      }
      success
      reward
      timestamp
      dungeonName
    }
    
    # 全局統計（如果有的話）
    globalStats(id: "global") {
      totalPlayers
      totalExpeditions
      successfulExpeditions
      totalRewardsDistributed
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
    };
  }>;
  heroPowerLeaders: Array<{
    id: string;
    tokenId: string;
    power: string;
    rarity: number;
    owner: {
      id: string;
    };
  }>;
  vipLeaders: Array<{
    id: string;
    owner: {
      id: string;
    };
    stakedAmount: string;
    stakedAt: string;
  }>;
  recentExpeditions: Array<{
    id: string;
    player: {
      id: string;
    };
    party: {
      tokenId: string;
      totalPower: string;
    };
    success: boolean;
    reward: string;
    timestamp: string;
    dungeonName: string;
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

// 排行榜標籤 - 回退到可用的基本排行榜
type LeaderboardTab = 'partypower' | 'heropower' | 'vip' | 'expeditions';

const LEADERBOARD_TABS: Array<{ id: LeaderboardTab; label: string; icon: string; description: string }> = [
  { id: 'partypower', label: '隊伍戰力', icon: '⚔️', description: '最強大的冒險隊伍' },
  { id: 'heropower', label: '英雄戰力', icon: '🦸‍♂️', description: '最強的個體英雄' },
  { id: 'vip', label: 'VIP 質押', icon: '👑', description: '質押最多的尊貴玩家' },
  { id: 'expeditions', label: '最近遠征', icon: '🗺️', description: '最近的遠征活動' },
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
                  隊伍 #{party.tokenId}
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

  const renderHeroPowerLeaderboard = () => (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm mb-4">基於英雄個體戰力排名</p>
      {leaderboardData.heroPowerLeaders?.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暫無英雄數據</p>
      ) : (
        leaderboardData.heroPowerLeaders?.map((hero, index) => {
          const rarityNames = ["", "N", "R", "SR", "SSR", "UR", "UR+"];
          return (
            <div key={hero.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
                <div>
                  <p className="text-white font-medium">
                    英雄 #{hero.tokenId}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {rarityNames[hero.rarity] || `${hero.rarity}★`} · 擁有者: {hero.owner.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-400 font-bold">{hero.power}</p>
                <p className="text-gray-400 text-sm">戰力</p>
              </div>
            </div>
          );
        }) || []
      )}
    </div>
  );

  const renderExpeditionLeaderboard = () => (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm mb-4">最近的遠征活動記錄</p>
      {leaderboardData.recentExpeditions?.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暫無遠征數據</p>
      ) : (
        leaderboardData.recentExpeditions?.map((expedition, index) => {
          return (
            <div key={expedition.id} className="bg-gray-700 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${expedition.success ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <p className="text-white font-medium">玩家 {expedition.player.id.slice(0, 8)}...</p>
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
                  <p className="text-gray-300">隊伍: <span className="text-purple-400">#{expedition.party.tokenId}</span> (戰力: {parseInt(expedition.party.totalPower).toLocaleString()})</p>
                </div>
                {expedition.success && (
                  <div className="text-right">
                    <p className="text-green-400 font-bold">+{parseFloat(formatEther(BigInt(expedition.reward))).toFixed(2)}</p>
                    <p className="text-gray-400 text-xs">SoulShard</p>
                  </div>
                )}
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
                <p className="text-white font-medium">玩家 {vip.owner.id.slice(0, 8)}...</p>
                <p className="text-gray-400 text-sm">
                  質押於 {new Date(parseInt(vip.stakedAt) * 1000).toLocaleDateString()}
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
      case 'heropower':
        return renderHeroPowerLeaderboard();
      case 'vip':
        return renderVIPLeaderboard();
      case 'expeditions':
        return renderExpeditionLeaderboard();
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-gray-700 p-1 rounded-lg">
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