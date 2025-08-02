// useLeaderboardData.ts - 獲取排行榜真實數據（簡化版）
import { useQuery } from '@tanstack/react-query';
import { THE_GRAPH_API_URL, isGraphConfigured } from '../config/graphConfig';
import { formatEther } from 'viem';

export type LeaderboardType = 
  | 'totalEarnings'    // 總收益
  | 'dungeonClears'    // 地下城通關數
  | 'playerLevel'      // 玩家等級
  | 'upgradeAttempts'; // 升級次數（使用等級替代）

export interface LeaderboardEntry {
  rank: number;
  address: string;
  value: string;
  displayName?: string;
  change?: number; // 排名變化
  isCurrentUser?: boolean;
}

// 統一使用 PlayerProfiles 實體，因為其他實體查詢有問題
const GET_LEADERBOARD_DATA = `
  query GetLeaderboardData($first: Int!, $orderBy: String!, $orderDirection: String!) {
    playerProfiles(
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { level_gt: 0 }
    ) {
      id
      totalRewardsEarned
      successfulExpeditions
      level
      experience
      name
      owner {
        id
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

  // 根據類型設置排序欄位
  let orderBy: string;
  const orderDirection = 'desc';

  switch (type) {
    case 'totalEarnings':
      orderBy = 'totalRewardsEarned';
      break;
    case 'dungeonClears':
      orderBy = 'successfulExpeditions';
      break;
    case 'playerLevel':
      orderBy = 'level';
      break;
    case 'upgradeAttempts':
      // 使用等級作為活躍度指標
      orderBy = 'level';
      break;
    default:
      throw new Error(`不支援的排行榜類型: ${type}`);
  }

  const variables = { 
    first: limit, 
    orderBy, 
    orderDirection 
  };

  try {
    const response = await fetch(THE_GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: GET_LEADERBOARD_DATA,
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
        orderBy,
        hasData: !!result.data,
        hasErrors: !!result.errors,
        dataKeys: result.data ? Object.keys(result.data) : [],
        dataCount: result.data?.playerProfiles?.length || 0,
        firstItem: result.data?.playerProfiles?.[0]
      });
    }

    if (result.errors) {
      console.warn('GraphQL 錯誤:', result.errors);
      console.warn('查詢類型:', type);
      console.warn('查詢變數:', variables);
      throw new Error(result.errors[0]?.message || 'GraphQL 查詢失敗');
    }

    const data = result.data;
    if (!data || !data.playerProfiles) {
      console.warn(`[Leaderboard] ${type} 無數據返回`);
      return [];
    }

    // 處理數據
    const entries: LeaderboardEntry[] = data.playerProfiles.map((profile: any, index: number) => {
      let value: string;
      let displayName: string | undefined;
      
      switch (type) {
        case 'totalEarnings':
          // 直接傳遞原始 BigInt 字符串，讓 formatSoul 處理格式化
          value = profile.totalRewardsEarned || '0';
          displayName = `${profile.successfulExpeditions || 0} 次成功遠征`;
          break;
        case 'dungeonClears':
          value = profile.successfulExpeditions.toString();
          displayName = `總獎勵 ${Math.floor(Number(formatEther(BigInt(profile.totalRewardsEarned || 0))))} SOUL`;
          break;
        case 'playerLevel':
          value = profile.level.toString();
          displayName = profile.name || `經驗 ${Math.floor(Number(formatEther(BigInt(profile.experience || 0))))}`;
          break;
        case 'upgradeAttempts':
          // 使用等級作為活躍度指標
          value = profile.level.toString();
          displayName = `${profile.successfulExpeditions || 0} 次遠征`;
          break;
        default:
          value = '0';
          displayName = '';
      }

      return {
        rank: index + 1,
        address: profile.owner.id,
        value,
        displayName,
        isCurrentUser: currentUserAddress ? 
          profile.owner.id.toLowerCase() === currentUserAddress.toLowerCase() : false
      };
    });

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