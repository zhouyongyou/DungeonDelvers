// useLeaderboardData.ts - 獲取排行榜真實數據
import { useQuery } from '@tanstack/react-query';
import { THE_GRAPH_API_URL, isGraphConfigured } from '../config/graphConfig';
import { formatEther } from 'viem';

export type LeaderboardType = 
  | 'totalEarnings'    // 總收益
  | 'dungeonClears'    // 地下城通關數
  | 'partyPower'       // 隊伍戰力
  | 'weeklyEarnings'   // 週收益
  | 'vipLevel';        // VIP 等級

export interface LeaderboardEntry {
  rank: number;
  address: string;
  value: string;
  displayName?: string;
  change?: number; // 排名變化
  isCurrentUser?: boolean;
}

// GraphQL 查詢 - 總收益排行榜
const GET_TOTAL_EARNINGS_LEADERBOARD = `
  query GetTotalEarningsLeaderboard($first: Int!) {
    players(
      first: $first
      orderBy: totalRewardsEarned
      orderDirection: desc
      where: { totalRewardsEarned_gt: "0" }
    ) {
      id
      totalRewardsEarned
      totalExpeditions
      successfulExpeditions
    }
  }
`;

// GraphQL 查詢 - 地下城通關數排行榜
const GET_DUNGEON_CLEARS_LEADERBOARD = `
  query GetDungeonClearsLeaderboard($first: Int!) {
    players(
      first: $first
      orderBy: successfulExpeditions
      orderDirection: desc
      where: { successfulExpeditions_gt: 0 }
    ) {
      id
      totalRewardsEarned
      totalExpeditions
      successfulExpeditions
    }
  }
`;

// GraphQL 查詢 - 隊伍戰力排行榜
const GET_PARTY_POWER_LEADERBOARD = `
  query GetPartyPowerLeaderboard($first: Int!) {
    parties(
      first: $first
      orderBy: totalPower
      orderDirection: desc
      where: { totalPower_gt: 0 }
    ) {
      id
      tokenId
      name
      totalPower
      totalRewardsEarned
      owner {
        id
      }
    }
  }
`;

// GraphQL 查詢 - 週收益排行榜（最近7天）
const GET_WEEKLY_EARNINGS_LEADERBOARD = `
  query GetWeeklyEarningsLeaderboard($first: Int!, $weekAgo: Int!) {
    players(
      first: $first
      orderBy: totalRewardsEarned
      orderDirection: desc
    ) {
      id
      totalRewardsEarned
      expeditions(
        first: 1000
        where: { 
          timestamp_gte: $weekAgo
          success: true 
        }
      ) {
        rewardAmount
        timestamp
      }
    }
  }
`;

const fetchLeaderboardData = async (
  type: LeaderboardType, 
  limit: number, 
  timeRange: 'daily' | 'weekly' | 'monthly' | 'all' = 'all',
  currentUserAddress?: string
): Promise<LeaderboardEntry[]> => {
  if (!THE_GRAPH_API_URL || !isGraphConfigured()) {
    throw new Error('子圖 API 未配置');
  }

  let query: string;
  let variables: any = { first: limit };

  // 根據類型選擇查詢
  switch (type) {
    case 'totalEarnings':
      query = GET_TOTAL_EARNINGS_LEADERBOARD;
      break;
    case 'dungeonClears':
      query = GET_DUNGEON_CLEARS_LEADERBOARD;
      break;
    case 'partyPower':
      query = GET_PARTY_POWER_LEADERBOARD;
      break;
    case 'weeklyEarnings':
      query = GET_WEEKLY_EARNINGS_LEADERBOARD;
      // 計算一週前的時間戳
      const weekAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
      variables.weekAgo = weekAgo;
      break;
    case 'vipLevel':
      // VIP 等級排行榜需要從合約查詢，暫時返回空數據
      return [];
    default:
      throw new Error(`不支援的排行榜類型: ${type}`);
  }

  try {
    const response = await fetch(THE_GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Graph API 錯誤: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.warn('GraphQL 錯誤:', result.errors);
      throw new Error(result.errors[0]?.message || 'GraphQL 查詢失敗');
    }

    const data = result.data;
    if (!data) {
      return [];
    }

    // 處理不同類型的數據
    let entries: LeaderboardEntry[] = [];

    if (type === 'partyPower' && data.parties) {
      entries = data.parties.map((party: any, index: number) => ({
        rank: index + 1,
        address: party.owner.id,
        value: party.totalPower.toString(),
        displayName: party.name || `Party #${party.tokenId}`,
        isCurrentUser: currentUserAddress ? 
          party.owner.id.toLowerCase() === currentUserAddress.toLowerCase() : false
      }));
    } else if (type === 'weeklyEarnings' && data.players) {
      // 計算週收益
      entries = data.players
        .map((player: any) => {
          const weeklyEarnings = player.expeditions.reduce((sum: bigint, exp: any) => {
            return sum + BigInt(exp.rewardAmount || 0);
          }, BigInt(0));
          
          return {
            address: player.id,
            weeklyEarnings: Number(formatEther(weeklyEarnings))
          };
        })
        .filter((player: any) => player.weeklyEarnings > 0)
        .sort((a: any, b: any) => b.weeklyEarnings - a.weeklyEarnings)
        .slice(0, limit)
        .map((player: any, index: number) => ({
          rank: index + 1,
          address: player.address,
          value: Math.floor(player.weeklyEarnings).toString(),
          isCurrentUser: currentUserAddress ? 
            player.address.toLowerCase() === currentUserAddress.toLowerCase() : false
        }));
    } else if (data.players) {
      // 處理玩家數據（總收益、地下城通關數）
      entries = data.players.map((player: any, index: number) => {
        let value: string;
        
        switch (type) {
          case 'totalEarnings':
            value = Math.floor(Number(formatEther(BigInt(player.totalRewardsEarned || 0)))).toString();
            break;
          case 'dungeonClears':
            value = player.successfulExpeditions.toString();
            break;
          default:
            value = '0';
        }

        return {
          rank: index + 1,
          address: player.id,
          value,
          isCurrentUser: currentUserAddress ? 
            player.id.toLowerCase() === currentUserAddress.toLowerCase() : false
        };
      });
    }

    return entries;
  } catch (error) {
    console.error('排行榜數據獲取失敗:', error);
    throw error;
  }
};

export const useLeaderboardData = (
  type: LeaderboardType,
  limit: number = 10,
  timeRange: 'daily' | 'weekly' | 'monthly' | 'all' = 'all',
  currentUserAddress?: string
) => {
  const query = useQuery({
    queryKey: ['leaderboard', type, limit, timeRange, currentUserAddress],
    queryFn: async () => {
      if (!isGraphConfigured()) {
        console.info(`[useLeaderboardData] 子圖未配置，${type} 排行榜不可用`);
        return [];
      }
      
      try {
        const realData = await fetchLeaderboardData(type, limit, timeRange, currentUserAddress);
        console.log(`[useLeaderboardData] ${type} 獲取到 ${realData?.length || 0} 條真實數據`);
        return realData || [];
      } catch (error) {
        console.error(`[useLeaderboardData] ${type} 真實數據獲取失敗:`, error);
        throw error; // 讓 React Query 處理錯誤狀態
      }
    },
    staleTime: 60 * 1000, // 1分鐘
    gcTime: 5 * 60 * 1000, // 5分鐘
    retry: 2,
    enabled: isGraphConfigured(), // 只有在子圖配置時才嘗試查詢
  });
  
  return {
    ...query,
    // 只有在成功獲取到真實數據時才標記為使用真實數據
    isUsingRealData: isGraphConfigured() && !query.error && query.data && query.data.length > 0,
    // 添加配置狀態
    isConfigured: isGraphConfigured()
  };
};