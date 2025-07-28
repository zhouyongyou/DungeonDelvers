// src/pages/ExplorerPageExample.tsx
// 探索者頁面示例 - 使用 Studio 版本

import React from 'react';
import { useGraphQLWithEndpoint } from '../hooks/useGraphQLWithEndpoint';
import { DataDelayNotice, EndpointIndicator } from '../components/ui/DataDelayNotice';

export const ExplorerPageExample: React.FC = () => {
  const { 
    data, 
    isLoading, 
    error, 
    hasDelay, 
    endpointType 
  } = useGraphQLWithEndpoint({
    feature: 'explorer', // 自動使用 Studio 版本
    query: `
      query GetExplorerData {
        players(first: 50, orderBy: totalRewardsEarned, orderDirection: desc) {
          id
          totalRewardsEarned
          heroesOwned
        }
        heroes(first: 100) {
          id
          tokenId
          rarity
          power
        }
      }
    `,
    queryKey: ['explorer-data']
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">探索者數據</h1>
        <EndpointIndicator endpointType={endpointType} />
      </div>
      
      <DataDelayNotice hasDelay={hasDelay} endpointType={endpointType} className="mb-4" />
      
      {isLoading && <div>加載中...</div>}
      {error && <div className="text-red-500">錯誤: {error.message}</div>}
      
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">頂級玩家</h2>
            <div className="space-y-2">
              {data.players?.map((player: any) => (
                <div key={player.id} className="p-3 bg-gray-50 rounded">
                  <div className="text-sm font-medium">{player.id}</div>
                  <div className="text-sm text-gray-600">
                    獎勵: {player.totalRewardsEarned} | 英雄: {player.heroesOwned}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-3">英雄統計</h2>
            <div className="text-sm text-gray-600">
              總英雄數: {data.heroes?.length || 0}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 隊伍管理頁面示例 - 使用去中心化版本
export const PartyManagementExample: React.FC<{ userAddress: string }> = ({ userAddress }) => {
  const { 
    data, 
    isLoading, 
    hasDelay, 
    endpointType 
  } = useGraphQLWithEndpoint({
    feature: 'party-management', // 自動使用付費版本
    query: `
      query GetUserParties($owner: String!) {
        parties(where: { owner: $owner }) {
          id
          tokenId
          totalPower
          heroIds
          relicIds
        }
      }
    `,
    variables: { owner: userAddress.toLowerCase() },
    queryKey: ['user-parties', userAddress]
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的隊伍</h1>
        <EndpointIndicator endpointType={endpointType} />
      </div>
      
      <DataDelayNotice hasDelay={hasDelay} endpointType={endpointType} className="mb-4" />
      
      {isLoading && <div>加載中...</div>}
      
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.parties?.map((party: any) => (
            <div key={party.id} className="p-4 bg-white border rounded-lg">
              <h3 className="font-semibold">隊伍 #{party.tokenId}</h3>
              <p className="text-sm text-gray-600">戰力: {party.totalPower}</p>
              <p className="text-sm text-gray-600">英雄: {party.heroIds?.length || 0}</p>
              <p className="text-sm text-gray-600">聖物: {party.relicIds?.length || 0}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};