// src/hooks/useGlobalStats.ts
// 全局統計數據 - 展示遊戲整體活躍度和健康狀況

import { useQuery } from '@tanstack/react-query';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';

interface GlobalStats {
  totalPlayers: number;
  totalHeroes: number;
  totalRelics: number;
  totalParties: number;
  totalUpgradeAttempts: number;
  successfulUpgrades: number;
  totalExpeditions: number;
  successfulExpeditions: number;
  totalRewardsDistributed: string;
  lastUpdatedAt: string;
}

interface GlobalUpgradeStats {
  totalAttempts: string;
  totalBurned: string;
  totalMinted: string;
  totalFeesCollected: string;
  lastUpdated: string;
}

const GET_GLOBAL_STATS_QUERY = `
  query GetGlobalStats {
    globalStats(id: "global") {
      totalPlayers
      totalHeroes
      totalRelics
      totalParties
      totalUpgradeAttempts
      successfulUpgrades
      totalExpeditions
      successfulExpeditions
      totalRewardsDistributed
      lastUpdatedAt
    }
    
    globalUpgradeStats(id: "global") {
      totalAttempts
      totalBurned
      totalMinted
      totalFeesCollected
      lastUpdated
    }
  }
`;

export const useGlobalStats = () => {
  return useQuery({
    queryKey: ['globalStats'],
    queryFn: async (): Promise<{
      gameStats: GlobalStats | null;
      upgradeStats: GlobalUpgradeStats | null;
    }> => {
      if (!THE_GRAPH_API_URL) {
        logger.warn('The Graph API URL not configured');
        return { gameStats: null, upgradeStats: null };
      }

      try {
        const response = await graphQLRateLimiter.execute(async () => {
          return fetch(THE_GRAPH_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: GET_GLOBAL_STATS_QUERY
            })
          });
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const { data, errors } = await response.json();
        
        if (errors) {
          logger.error('GraphQL errors fetching global stats:', errors);
          throw new Error(errors[0]?.message || 'GraphQL error');
        }

        return {
          gameStats: data?.globalStats || null,
          upgradeStats: data?.globalUpgradeStats || null
        };
      } catch (error) {
        logger.error('Error fetching global stats:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2分鐘緩存（統計數據可以稍微新一點）
    gcTime: 10 * 60 * 1000, // 10分鐘垃圾回收
    retry: 2,
    enabled: !!THE_GRAPH_API_URL,
  });
};

// 計算成功率的輔助函數
export const calculateSuccessRates = (stats: GlobalStats | null) => {
  if (!stats) return null;

  return {
    upgradeSuccessRate: stats.totalUpgradeAttempts > 0 
      ? Math.round((stats.successfulUpgrades / stats.totalUpgradeAttempts) * 100)
      : 0,
    expeditionSuccessRate: stats.totalExpeditions > 0
      ? Math.round((stats.successfulExpeditions / stats.totalExpeditions) * 100) 
      : 0,
    totalSuccess: stats.successfulUpgrades + stats.successfulExpeditions,
    totalAttempts: stats.totalUpgradeAttempts + stats.totalExpeditions
  };
};

// 格式化大數字顯示
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
};

// 生成趨勢文本（模擬 - 實際需要歷史數據）
export const generateTrendText = (stats: GlobalStats | null): string => {
  if (!stats) return '';
  
  const now = Math.floor(Date.now() / 1000);
  const lastUpdated = parseInt(stats.lastUpdatedAt);
  const hoursSinceUpdate = (now - lastUpdated) / 3600;
  
  if (hoursSinceUpdate < 1) {
    return '實時更新';
  } else if (hoursSinceUpdate < 24) {
    return `${Math.floor(hoursSinceUpdate)}小時前更新`;
  } else {
    return `${Math.floor(hoursSinceUpdate / 24)}天前更新`;
  }
};

// 活躍度指標
export const useActivityIndicators = () => {
  const { data } = useGlobalStats();
  
  if (!data?.gameStats) return null;
  
  const stats = data.gameStats;
  const successRates = calculateSuccessRates(stats);
  
  return {
    // 活躍度等級 (基於總操作數)
    activityLevel: (() => {
      const totalActions = stats.totalUpgradeAttempts + stats.totalExpeditions;
      if (totalActions > 10000) return 'high';
      if (totalActions > 1000) return 'medium';
      return 'low';
    })(),
    
    // 遊戲健康度 (基於成功率)
    healthScore: (() => {
      if (!successRates) return 'unknown';
      const avgSuccessRate = (successRates.upgradeSuccessRate + successRates.expeditionSuccessRate) / 2;
      if (avgSuccessRate > 70) return 'excellent';
      if (avgSuccessRate > 50) return 'good';
      if (avgSuccessRate > 30) return 'fair';
      return 'poor';
    })(),
    
    // 玩家參與度 (平均每個玩家的操作數)
    engagementLevel: (() => {
      if (stats.totalPlayers === 0) return 0;
      const actionsPerPlayer = (stats.totalUpgradeAttempts + stats.totalExpeditions) / stats.totalPlayers;
      return Math.round(actionsPerPlayer);
    })(),
    
    successRates
  };
};