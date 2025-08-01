// useLeaderboardData.ts - 獲取排行榜真實數據
import { useQuery } from '@tanstack/react-query';
import { THE_GRAPH_API_URL, isGraphConfigured } from '../config/graphConfig';
import { formatEther } from 'viem';

export type LeaderboardType = 
  | 'totalEarnings'    // 總收益
  | 'dungeonClears'    // 地下城通關數
  | 'playerLevel'      // 玩家等級
  | 'upgradeAttempts'; // 升級次數
  // VIP 等級已移除 - 子圖沒有 VIP level 欄位

export interface LeaderboardEntry {
  rank: number;
  address: string;
  value: string;
  displayName?: string;
  change?: number; // 排名變化
  isCurrentUser?: boolean;
}

// GraphQL 查詢 - 總收益排行榜（改用 PlayerStats）
const GET_TOTAL_EARNINGS_LEADERBOARD = `
  query GetTotalEarningsLeaderboard($first: Int!) {
    playerStats(
      first: $first
      orderBy: totalRewardsEarned
      orderDirection: desc
      where: { totalRewardsEarned_gt: "0" }
    ) {
      id
      totalRewardsEarned
      successfulExpeditions
    }
  }
`;

// GraphQL 查詢 - 地下城通關數排行榜
const GET_DUNGEON_CLEARS_LEADERBOARD = `
  query GetDungeonClearsLeaderboard($first: Int!) {
    playerProfiles(
      first: $first
      orderBy: successfulExpeditions
      orderDirection: desc
      where: { successfulExpeditions_gt: 0 }
    ) {
      id
      totalRewardsEarned
      successfulExpeditions
      owner {
        id
      }
    }
  }
`;

// GraphQL 查詢 - 玩家等級排行榜
const GET_PLAYER_LEVEL_LEADERBOARD = `
  query GetPlayerLevelLeaderboard($first: Int!) {
    playerProfiles(
      first: $first
      orderBy: level
      orderDirection: desc
      where: { level_gt: 0 }
    ) {
      id
      level
      experience
      name
      owner {
        id
      }
    }
  }
`;

// GraphQL 查詢 - 升級次數排行榜
const GET_UPGRADE_ATTEMPTS_LEADERBOARD = `
  query GetUpgradeAttemptsLeaderboard($first: Int!) {
    playerStats(
      first: $first
      orderBy: totalUpgradeAttempts
      orderDirection: desc
      where: { totalUpgradeAttempts_gt: 0 }
    ) {
      id
      totalUpgradeAttempts
      successfulUpgrades
    }
  }
`;

// VIP 等級排行榜已移除 - 子圖 VIP 實體沒有 level 欄位
// VIP 等級需要從前端合約直接讀取


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
    case 'playerLevel':
      query = GET_PLAYER_LEVEL_LEADERBOARD;
      break;
    case 'upgradeAttempts':
      query = GET_UPGRADE_ATTEMPTS_LEADERBOARD;
      break;
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
    
    // 調試日誌
    if (import.meta.env.DEV) {
      console.log(`[Leaderboard] ${type} 查詢結果:`, {
        type,
        hasData: !!result.data,
        hasErrors: !!result.errors,
        dataKeys: result.data ? Object.keys(result.data) : [],
        firstItem: result.data?.playerProfiles?.[0] || result.data?.playerStats?.[0]
      });
    }

    if (result.errors) {
      console.warn('GraphQL 錯誤:', result.errors);
      console.warn('查詢類型:', type);
      console.warn('查詢內容:', query);
      console.warn('查詢變數:', variables);
      throw new Error(result.errors[0]?.message || 'GraphQL 查詢失敗');
    }

    const data = result.data;
    if (!data) {
      console.warn(`[Leaderboard] ${type} 無數據返回`);
      return [];
    }

    // 處理不同類型的數據
    let entries: LeaderboardEntry[] = [];

    if (type === 'playerLevel' && data.playerProfiles) {
      entries = data.playerProfiles.map((profile: any, index: number) => ({
        rank: index + 1,
        address: profile.owner.id,
        value: profile.level.toString(),
        displayName: profile.name || undefined,
        isCurrentUser: currentUserAddress ? 
          profile.owner.id.toLowerCase() === currentUserAddress.toLowerCase() : false
      }));
    } else if (type === 'upgradeAttempts' && data.playerStats) {
      entries = data.playerStats.map((stats: any, index: number) => ({
        rank: index + 1,
        address: stats.id, // PlayerStats 的 id 就是玩家地址
        value: stats.totalUpgradeAttempts.toString(),
        displayName: `成功率 ${Math.round((stats.successfulUpgrades / stats.totalUpgradeAttempts) * 100)}%`,
        isCurrentUser: currentUserAddress ? 
          stats.id.toLowerCase() === currentUserAddress.toLowerCase() : false
      }));
    } else if (type === 'totalEarnings' && data.playerStats) {
      // 處理總收益數據（從 PlayerStats）
      entries = data.playerStats.map((stats: any, index: number) => ({
        rank: index + 1,
        address: stats.id, // PlayerStats 的 id 就是玩家地址
        value: Math.floor(Number(formatEther(BigInt(stats.totalRewardsEarned || 0)))).toString(),
        displayName: `${stats.successfulExpeditions || 0} 次成功遠征`,
        isCurrentUser: currentUserAddress ? 
          stats.id.toLowerCase() === currentUserAddress.toLowerCase() : false
      }));
    // VIP 等級排行榜已移除 - 子圖沒有相應數據結構
    } else if (data.playerProfiles) {
      // 處理玩家檔案數據（地下城通關數）
      entries = data.playerProfiles.map((profile: any, index: number) => {
        let value: string;
        let displayName: string | undefined;
        
        switch (type) {
          case 'dungeonClears':
            value = profile.successfulExpeditions.toString();
            displayName = `總獎勵 ${Math.floor(Number(formatEther(BigInt(profile.totalRewardsEarned || 0))))} SOUL`;
            break;
          default:
            value = '0';
        }

        return {
          rank: index + 1,
          address: profile.owner.id, // 使用 owner.id 而不是 profile.id
          value,
          displayName,
          isCurrentUser: currentUserAddress ? 
            profile.owner.id.toLowerCase() === currentUserAddress.toLowerCase() : false
        };
      });
    } else if (data.players) {
      // 處理玩家數據（舊版查詢兼容）
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
  // 根據排行榜類型設置不同的緩存時間
  const getCacheConfig = (type: LeaderboardType) => {
    switch (type) {
      // 低變動頻率，長緩存
      case 'playerLevel':
        return { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 }; // 5分鐘過期，30分鐘清理
      
      // 中等變動頻率
      case 'partyPower':
      case 'upgradeAttempts':
        return { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 }; // 2分鐘過期，10分鐘清理
      
      // 高變動頻率，短緩存
      case 'totalEarnings':
      case 'dungeonClears':
      default:
        return { staleTime: 60 * 1000, gcTime: 5 * 60 * 1000 }; // 1分鐘過期，5分鐘清理
    }
  };

  const cacheConfig = getCacheConfig(type);

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
    ...cacheConfig,
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