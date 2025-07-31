// 測試組件：使用 GraphQL Code Generator 生成的類型
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { THE_GRAPH_API_URL } from '../../config/graphConfig';
import type { GetPlayerAnalyticsQuery, GetPlayerAnalyticsQueryVariables } from '../../gql/generated';

// 導入查詢字符串（需要手動導入 .graphql 文件內容）
const GET_PLAYER_ANALYTICS_QUERY = `
  query GetPlayerAnalytics($address: ID!) {
    player(id: $address) {
      id
      profile {
        id
        name
        level
        experience
        successfulExpeditions
        totalRewardsEarned
      }
      parties(first: 5, orderBy: totalPower, orderDirection: desc) {
        id
        tokenId
        name
        totalPower
      }
      expeditions(first: 10, orderBy: timestamp, orderDirection: desc) {
        id
        success
        reward
        expGained
        timestamp
        dungeonId
        dungeonName
        party {
          id
          name
        }
      }
    }
  }
`;

export const TypedPlayerAnalytics: React.FC = () => {
  const { address } = useAccount();

  // 使用生成的類型！完全的類型安全！
  const { data, isLoading, error } = useQuery<GetPlayerAnalyticsQuery>({
    queryKey: ['typed-player-analytics', address],
    queryFn: async (): Promise<GetPlayerAnalyticsQuery> => {
      if (!address || !THE_GRAPH_API_URL) {
        throw new Error('Missing address or API URL');
      }

      const variables: GetPlayerAnalyticsQueryVariables = {
        address: address.toLowerCase()
      };

      const response = await fetch(THE_GRAPH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GET_PLAYER_ANALYTICS_QUERY,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
      }

      return result.data;
    },
    enabled: !!address && !!THE_GRAPH_API_URL,
    staleTime: 30000
  });

  if (!address) {
    return (
      <div className="p-4 text-center text-gray-400">
        請先連接錢包
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-gray-400">載入類型安全的數據中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        錯誤: {error instanceof Error ? error.message : '未知錯誤'}
      </div>
    );
  }

  // 🎉 完全的類型安全！IDE 會提供完整的自動補全
  const player = data?.player;
  const profile = player?.profile;
  const parties = player?.parties || [];
  const expeditions = player?.expeditions || [];

  return (
    <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        🎯 類型安全的玩家分析
        <span className="text-xs bg-green-600 px-2 py-1 rounded">
          GraphQL Codegen
        </span>
      </h2>

      {profile && (
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">玩家資料</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">名稱:</span>
              <span className="text-white ml-2">{profile.name}</span>
            </div>
            <div>
              <span className="text-gray-400">等級:</span>
              <span className="text-white ml-2">{profile.level}</span>
            </div>
            <div>
              <span className="text-gray-400">經驗值:</span>
              <span className="text-white ml-2">{profile.experience}</span>
            </div>
            <div>
              <span className="text-gray-400">成功遠征:</span>
              <span className="text-white ml-2">{profile.successfulExpeditions}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">總獎勵:</span>
              <span className="text-white ml-2">{profile.totalRewardsEarned} SOUL</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* 隊伍列表 */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">頂級隊伍</h3>
          <div className="space-y-2">
            {parties.map((party) => (
              <div key={party.id} className="p-3 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">{party.name}</span>
                  <span className="text-blue-400">{party.totalPower} 戰力</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  #{party.tokenId}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 遠征歷史 */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">最近遠征</h3>
          <div className="space-y-2">
            {expeditions.slice(0, 5).map((expedition) => (
              <div key={expedition.id} className="p-3 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm">{expedition.dungeonName}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    expedition.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {expedition.success ? '成功' : '失敗'}
                  </span>
                </div>
                {expedition.success && (
                  <div className="text-xs text-gray-400 mt-1">
                    獲得: {expedition.reward} SOUL | {expedition.expGained} EXP
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
        <div className="text-sm text-green-400">
          ✅ 使用了 GraphQL Code Generator 生成的類型
          <br />
          ✅ 完全的 TypeScript 類型安全
          <br />
          ✅ IDE 自動補全支援
        </div>
      </div>
    </div>
  );
};