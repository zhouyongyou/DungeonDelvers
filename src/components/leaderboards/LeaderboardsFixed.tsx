// src/components/leaderboards/LeaderboardsFixed.tsx
// 修復版本 - 使用實際可用的子圖數據

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatEther } from 'viem';
import { THE_GRAPH_API_URL, isGraphConfigured } from '../../config/graphConfig';

// 修復的 GraphQL 查詢 - 使用實際可用的數據
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
        profile {
          name
        }
      }
    }
    
    # 英雄戰力排行榜 - 前 10 名
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
        profile {
          name
        }
      }
    }
    
    # VIP 質押排行榜 - 前 10 名
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
      stakedAt
    }
    
    # NFT 收藏排行榜 - 基於玩家資產數量
    collectionLeaders: players(
      first: 20
    ) {
      id
      profile {
        name
      }
      heros(first: 1000) {
        id
        power
        rarity
      }
      relics(first: 1000) {
        id
        capacity
        rarity
      }
      parties(first: 1000) {
        id
        totalPower
      }
    }
    
    # 全局統計
    globalStats(id: "global") {
      totalPlayers
      totalHeroes
      totalRelics
      totalParties
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
  heroPowerLeaders: Array<{
    id: string;
    tokenId: string;
    power: string;
    rarity: number;
    owner: {
      id: string;
      profile?: { name: string };
    };
  }>;
  vipLeaders: Array<{
    id: string;
    owner: {
      id: string;
      profile?: { name: string };
    };
    stakedAmount: string;
    stakedAt: string;
  }>;
  collectionLeaders: Array<{
    id: string;
    profile?: { name: string };
    heros: Array<{ id: string; power: string; rarity: number }>;
    relics: Array<{ id: string; capacity: string; rarity: number }>;
    parties: Array<{ id: string; totalPower: string }>;
  }>;
  globalStats?: {
    totalPlayers: number;
    totalHeroes: number;
    totalRelics: number;
    totalParties: number;
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

// 處理收藏排行榜數據
function processCollectionLeaders(players: LeaderboardData['collectionLeaders']) {
  return players
    .map(player => {
      const totalHeroes = player.heros?.length || 0;
      const totalRelics = player.relics?.length || 0;
      const totalParties = player.parties?.length || 0;
      const totalAssets = totalHeroes + totalRelics + totalParties;
      
      const avgHeroPower = player.heros?.length > 0 
        ? player.heros.reduce((sum, hero) => sum + parseInt(hero.power), 0) / player.heros.length 
        : 0;
      
      const totalPartyPower = player.parties?.reduce(
        (sum, party) => sum + parseInt(party.totalPower), 0
      ) || 0;

      return {
        player,
        totalAssets,
        totalHeroes,
        totalRelics,
        totalParties,
        avgHeroPower: Math.round(avgHeroPower),
        totalPartyPower
      };
    })
    .filter(p => p.totalAssets > 0)
    .sort((a, b) => b.totalAssets - a.totalAssets)
    .slice(0, 10);
}

// 排行榜標籤
type LeaderboardTab = 'partypower' | 'heropower' | 'vip' | 'collection';

const LEADERBOARD_TABS: Array<{ id: LeaderboardTab; label: string; icon: string }> = [
  { id: 'partypower', label: '隊伍戰力', icon: '⚔️' },
  { id: 'heropower', label: '英雄戰力', icon: '🦸‍♂️' },
  { id: 'collection', label: 'NFT 收藏', icon: '🎭' },
  { id: 'vip', label: 'VIP 質押', icon: '👑' },
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

  const renderHeroPowerLeaderboard = () => (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm mb-4">基於英雄個體戰力排名</p>
      {leaderboardData.heroPowerLeaders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暫無英雄數據</p>
      ) : (
        leaderboardData.heroPowerLeaders.map((hero, index) => {
          const rarityNames = ["", "Common", "Rare", "Epic", "Legendary", "Mythic"];
          return (
            <div key={hero.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
                <div>
                  <p className="text-white font-medium">
                    英雄 #{hero.tokenId} - {formatPlayerName(hero.owner)}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {rarityNames[hero.rarity] || `稀有度 ${hero.rarity}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-400 font-bold">{hero.power}</p>
                <p className="text-gray-400 text-sm">戰力</p>
              </div>
            </div>
          );
        })
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

  const renderCollectionLeaderboard = () => {
    const collectionLeaders = processCollectionLeaders(leaderboardData.collectionLeaders);
    
    return (
      <div className="space-y-3">
        <p className="text-gray-400 text-sm mb-4">基於 NFT 總收藏數量排名</p>
        {collectionLeaders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暫無收藏數據</p>
        ) : (
          collectionLeaders.map((player, index) => (
            <div key={player.player.id} className="bg-gray-700 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-yellow-400">#{index + 1}</span>
                  <div>
                    <p className="text-white font-medium">{formatPlayerName(player.player)}</p>
                    <p className="text-gray-400 text-sm">
                      平均英雄戰力: {player.avgHeroPower} · 隊伍總戰力: {player.totalPartyPower.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold">{player.totalAssets}</p>
                  <p className="text-gray-400 text-sm">總 NFT</p>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">🦸‍♂️ {player.totalHeroes} 英雄</span>
                <span className="text-orange-400">💎 {player.totalRelics} 聖物</span>
                <span className="text-purple-400">⚔️ {player.totalParties} 隊伍</span>
              </div>
            </div>
          ))
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
      case 'collection':
        return renderCollectionLeaderboard();
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
            <p>NFT 總數: {leaderboardData.globalStats.totalHeroes + leaderboardData.globalStats.totalRelics + leaderboardData.globalStats.totalParties}</p>
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
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-center ${
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
        每 30 秒自動刷新 · 數據來源: The Graph (修復版)
      </div>
    </div>
  );
});

LeaderboardsFixed.displayName = 'LeaderboardsFixed';