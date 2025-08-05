// usePlayerAnalytics.ts - 獲取玩家真實分析數據
import { useQuery } from '@tanstack/react-query';
import { useAccount, useReadContracts } from 'wagmi';
import { getContractWithABI } from '../config/contractsWithABI';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { formatEther } from 'viem';

// GraphQL 查詢玩家的歷史數據
const GET_PLAYER_ANALYTICS = `
  query GetPlayerAnalytics($address: Bytes!, $first: Int!, $skip: Int!) {
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
      stats {
        id
        totalExpeditions
        successfulExpeditions
        totalRewardsEarned
        highestPartyPower
      }
      parties(first: 20, orderBy: totalPower, orderDirection: desc) {
        id
        tokenId
        name
        totalPower
        expeditions(first: 100) {
          id
          success
          reward
          timestamp
          dungeonId
          dungeonName
        }
      }
      expeditions(first: $first, skip: $skip, orderBy: timestamp, orderDirection: desc) {
        id
        success
        reward
        expGained
        timestamp
        dungeonId
        dungeonName
        dungeonPowerRequired
        party {
          id
          name
        }
      }
    }
  }
`;

export interface PlayerAnalytics {
  // 總體統計
  totalEarnings: bigint;
  totalExpeditions: number;
  successfulExpeditions: number;
  successRate: number;
  
  // 地下城統計
  dungeonStats: {
    favoritesDungeon: string;
    avgRewardPerRun: number;
    totalAttempts: number;
    successRate: number;
  };
  
  // 隊伍表現
  partyPerformance: Array<{
    partyId: string;
    name: string;
    totalEarnings: number;
    winRate: number;
    avgPower: number;
  }>;
  
  // 收益趨勢（最近30天）
  earningsTrend: Array<{
    date: string;
    earnings: number;
    dungeonRewards: number;
    referralRewards: number;
  }>;
}

export const usePlayerAnalytics = (timeRange: number = 30) => {
  const { address } = useAccount();
  
  // 從 The Graph 獲取歷史數據
  const { data: graphData, isLoading: isLoadingGraph } = useQuery({
    queryKey: ['playerAnalytics', address, timeRange],
    queryFn: async () => {
      if (!address || !THE_GRAPH_API_URL) {
        return { player: null }; // 返回一個有效的對象而不是 null
      }
      
      try {
        const response = await fetch(THE_GRAPH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: GET_PLAYER_ANALYTICS,
            variables: {
              address: address.toLowerCase(),
              first: 1000, // 獲取最近1000筆遠征記錄
              skip: 0
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Graph API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.errors) {
          console.warn('GraphQL errors:', result.errors);
          // 檢查是否是實體不存在的錯誤
          const hasEntityErrors = result.errors.some((error: any) => 
            error.message?.includes('Cannot return null for non-nullable field') ||
            error.message?.includes('Unknown field') ||
            error.message?.includes('Cannot query field')
          );
          
          if (hasEntityErrors) {
            console.info('子圖實體結構不匹配，返回空數據');
            return null;
          }
          
          return { player: null };
        }
        
        return result.data || null;
      } catch (error) {
        console.error('Player analytics fetch error:', error);
        return { player: null }; // 返回一個有效的對象
      }
    },
    enabled: !!address && !!THE_GRAPH_API_URL,
    staleTime: 5 * 60 * 1000, // 5分鐘
  });
  
  // 從合約讀取當前數據
  const contracts = [
    getContractWithABI(56, 'playerProfile'),
    getContractWithABI(56, 'playerVault')
  ];
  
  const { data: contractData } = useReadContracts({
    contracts: address && contracts[0] && contracts[1] ? [
      {
        address: contracts[0].address,
        abi: contracts[0].abi,
        functionName: 'getProfile',
        args: [address]
      },
      {
        address: contracts[1].address,
        abi: contracts[1].abi,
        functionName: 'getBalance',
        args: [address]
      }
    ] : [],
    enabled: !!address && !!contracts[0] && !!contracts[1]
  });
  
  // 處理和組合數據 - 修復數據處理邏輯
  const analytics: PlayerAnalytics | null = graphData?.player ? (() => {
    // 從新的查詢結構獲取數據
    const playerData = graphData.player;
    const profileData = playerData.profile;
    const statsData = playerData.stats;
    const expeditions = playerData.expeditions || [];
    
    // 使用正確的總收益數據，優先從 stats 中取得，因為它是實際更新的欄位
    const totalEarnings = BigInt(statsData?.totalRewardsEarned || profileData?.totalRewardsEarned || 0);
    
    // 調試日誌
    console.log('[usePlayerAnalytics] 總收益計算:', {
      statsTotal: statsData?.totalRewardsEarned,
      profileTotal: profileData?.totalRewardsEarned,
      finalTotal: totalEarnings.toString()
    });
    const totalExpeditions = expeditions.length;
    const successfulExpeditions = profileData?.successfulExpeditions || 0;
    const successRate = totalExpeditions > 0 
      ? (successfulExpeditions / totalExpeditions) * 100 
      : 0;
    
    // 分析地下城偏好
    const dungeonCounts: Record<string, { count: number; rewards: bigint; name: string }> = {};
    expeditions.forEach((exp: any) => {
      const dungeonId = exp.dungeonId?.toString() || 'unknown';
      if (!dungeonCounts[dungeonId]) {
        dungeonCounts[dungeonId] = {
          count: 0,
          rewards: BigInt(0),
          name: exp.dungeonName || `Dungeon ${dungeonId}`
        };
      }
      dungeonCounts[dungeonId].count++;
      if (exp.success) {
        dungeonCounts[dungeonId].rewards += BigInt(exp.reward || 0);
      }
    });
    
    const favoriteDungeon = Object.entries(dungeonCounts)
      .sort(([, a], [, b]) => b.count - a.count)[0];
    
    // 隊伍表現分析
    const partyPerformance = playerData?.parties?.slice(0, 5).map((party: any) => {
      const partyExpeditions = party.expeditions || [];
      const successCount = partyExpeditions.filter((e: any) => e.success).length;
      const totalEarnings = partyExpeditions.reduce((sum: bigint, e: any) => 
        sum + (e.success ? BigInt(e.reward || 0) : BigInt(0)), 
        BigInt(0)
      );
      
      return {
        partyId: party.id,
        name: party.name || `Party #${party.tokenId}`,
        totalEarnings: Number(formatEther(totalEarnings)),
        winRate: partyExpeditions.length > 0 ? (successCount / partyExpeditions.length) * 100 : 0,
        avgPower: parseInt(party.totalPower || '0')
      };
    }) || [];
    
    // 收益趨勢（最近30天）
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const earningsByDay: Record<string, bigint> = {};
    
    // 初始化最近30天
    for (let i = 0; i < timeRange; i++) {
      const date = new Date(now - i * dayMs).toLocaleDateString('zh-TW', { 
        month: 'short', 
        day: 'numeric' 
      });
      earningsByDay[date] = BigInt(0);
    }
    
    // 填充真實數據
    expeditions.forEach((exp: any) => {
      if (exp.success && exp.timestamp) {
        const expDate = new Date(parseInt(exp.timestamp) * 1000);
        const daysDiff = Math.floor((now - expDate.getTime()) / dayMs);
        
        if (daysDiff < timeRange) {
          const dateKey = expDate.toLocaleDateString('zh-TW', { 
            month: 'short', 
            day: 'numeric' 
          });
          earningsByDay[dateKey] = (earningsByDay[dateKey] || BigInt(0)) + BigInt(exp.reward || 0);
        }
      }
    });
    
    const earningsTrend = Object.entries(earningsByDay)
      .reverse()
      .map(([date, earnings]) => ({
        date,
        earnings: Number(formatEther(earnings)),
        dungeonRewards: Number(formatEther(earnings)), // 暫時全部算作地下城獎勵
        referralRewards: 0 // TODO: 整合推薦獎勵數據
        // 💡 暫緩：推薦系統尚未上線，待合約部署後實作
      }));
    
    return {
      totalEarnings,
      totalExpeditions,
      successfulExpeditions,
      successRate,
      dungeonStats: {
        favoritesDungeon: favoriteDungeon?.[1].name || '無',
        avgRewardPerRun: totalExpeditions > 0 
          ? Number(formatEther(totalEarnings)) / totalExpeditions 
          : 0,
        totalAttempts: totalExpeditions,
        successRate
      },
      partyPerformance,
      earningsTrend
    };
  })() : null;
  
  return {
    data: analytics,
    isLoading: isLoadingGraph,
    hasRealData: !!(graphData?.player?.profile || graphData?.player?.expeditions?.length)
  };
};