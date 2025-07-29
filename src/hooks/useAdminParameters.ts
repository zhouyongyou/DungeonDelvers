// src/hooks/useAdminParameters.ts
// 動態遊戲參數獲取 - 讓前端顯示最新的遊戲費用和配置

import { useQuery } from '@tanstack/react-query';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';
import { logger } from '../utils/logger';

interface AdminParameters {
  // 鑄造價格
  heroMintPriceUSD: string;
  relicMintPriceUSD: string;
  provisionPriceUSD: string;
  
  // 平台費用
  heroPlatformFee: string;
  relicPlatformFee: string;
  partyPlatformFee: string;
  explorationFee: string;
  
  // 遊戲參數
  restCostPowerDivisor: string;
  vipUnstakeCooldown: string;
  globalRewardMultiplier: string;
  commissionRate: string;
  
  // 元數據
  lastUpdatedAt: string;
  updatedBy: string;
}

const GET_ADMIN_PARAMETERS_QUERY = `
  query GetAdminParameters {
    adminParameters(id: "admin") {
      heroMintPriceUSD
      relicMintPriceUSD
      provisionPriceUSD
      heroPlatformFee
      relicPlatformFee
      partyPlatformFee
      explorationFee
      restCostPowerDivisor
      vipUnstakeCooldown
      globalRewardMultiplier
      commissionRate
      lastUpdatedAt
      updatedBy
    }
  }
`;

export const useAdminParameters = () => {
  return useQuery({
    queryKey: ['adminParameters'],
    queryFn: async (): Promise<AdminParameters | null> => {
      if (!THE_GRAPH_API_URL) {
        logger.warn('The Graph API URL not configured');
        return null;
      }

      try {
        const response = await graphQLRateLimiter.execute(async () => {
          return fetch(THE_GRAPH_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: GET_ADMIN_PARAMETERS_QUERY
            })
          });
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const { data, errors } = await response.json();
        
        if (errors) {
          logger.error('GraphQL errors fetching admin parameters:', errors);
          throw new Error(errors[0]?.message || 'GraphQL error');
        }

        return data?.adminParameters || null;
      } catch (error) {
        logger.error('Error fetching admin parameters:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5分鐘緩存
    gcTime: 30 * 60 * 1000, // 30分鐘垃圾回收
    retry: 2,
    enabled: !!THE_GRAPH_API_URL,
  });
};

// 格式化價格顯示的輔助函數
export const formatPrice = (priceWei: string, decimals: number = 18): string => {
  try {
    const price = BigInt(priceWei);
    const divisor = BigInt(10 ** decimals);
    const wholePart = price / divisor;
    const fractionalPart = price % divisor;
    
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }
    
    // 顯示最多2位小數
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '').slice(0, 2);
    
    if (trimmedFractional === '') {
      return wholePart.toString();
    }
    
    return `${wholePart}.${trimmedFractional}`;
  } catch (error) {
    logger.error('Error formatting price:', error);
    return '0';
  }
};

// 計算手續費的輔助函數
export const calculateTotalCost = (
  basePrice: string, 
  platformFee: string, 
  decimals: number = 18
): { basePrice: string; platformFee: string; total: string } => {
  try {
    const base = BigInt(basePrice);
    const fee = BigInt(platformFee);
    const total = base + fee;
    
    return {
      basePrice: formatPrice(basePrice, decimals),
      platformFee: formatPrice(platformFee, decimals),
      total: formatPrice(total.toString(), decimals)
    };
  } catch (error) {
    logger.error('Error calculating total cost:', error);
    return {
      basePrice: '0',
      platformFee: '0', 
      total: '0'
    };
  }
};

// 檢查參數是否最近更新過
export const useParameterFreshness = () => {
  const { data: adminParams } = useAdminParameters();
  
  if (!adminParams?.lastUpdatedAt) return null;
  
  const now = Math.floor(Date.now() / 1000);
  const lastUpdated = parseInt(adminParams.lastUpdatedAt);
  const hoursSinceUpdate = (now - lastUpdated) / 3600;
  
  return {
    hoursSinceUpdate: Math.floor(hoursSinceUpdate),
    isRecent: hoursSinceUpdate < 24, // 24小時內算是最近更新
    isFresh: hoursSinceUpdate < 1,   // 1小時內算是非常新
    lastUpdatedAt: lastUpdated
  };
};