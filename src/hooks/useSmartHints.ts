// src/hooks/useSmartHints.ts
// 智能提示系統 - 基於歷史數據給出建議

import { useQuery } from '@tanstack/react-query';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { graphQLRateLimiter } from '../utils/rateLimiter';

// 升級成功率預測
export const useUpgradeSuccessRate = (playerAddress: string, targetRarity: number, vipLevel: number = 0) => {
  return useQuery({
    queryKey: ['upgradeSuccessRate', playerAddress, targetRarity, vipLevel],
    queryFn: async () => {
      const query = `
        query GetUpgradeStats($player: Bytes!, $targetRarity: Int!) {
          upgradeAttempts(
            where: { 
              player: $player, 
              baseRarity: $targetRarity 
            }, 
            first: 50,
            orderBy: timestamp,
            orderDirection: desc
          ) {
            isSuccess
            vipLevel
            totalVipBonus
          }
          
          # 全局成功率參考
          globalUpgradeStats(id: "global") {
            totalAttempts
            totalMinted
          }
        }
      `;

      const response = await graphQLRateLimiter.execute(() =>
        fetch(THE_GRAPH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            variables: { player: playerAddress.toLowerCase(), targetRarity }
          })
        })
      );

      const { data } = await response.json();
      
      // 計算個人成功率
      const attempts = data.upgradeAttempts || [];
      const personalSuccessRate = attempts.length > 0 
        ? (attempts.filter((a: any) => a.isSuccess).length / attempts.length) * 100 
        : 0;

      // 計算 VIP 加成影響
      const vipBonus = vipLevel > 0 
        ? attempts.find((a: any) => a.vipLevel === vipLevel)?.totalVipBonus || 0 
        : 0;

      // 全局成功率
      const globalStats = data.globalUpgradeStats;
      const globalSuccessRate = globalStats 
        ? (parseInt(globalStats.totalMinted) / parseInt(globalStats.totalAttempts)) * 100 
        : 50;

      return {
        personalRate: Math.round(personalSuccessRate),
        globalRate: Math.round(globalSuccessRate),
        vipBonus,
        sampleSize: attempts.length,
        recommendation: personalSuccessRate > 0 
          ? personalSuccessRate > 70 ? 'recommended' : personalSuccessRate < 30 ? 'risky' : 'moderate'
          : globalSuccessRate > 50 ? 'try' : 'careful'
      };
    },
    enabled: !!playerAddress,
    staleTime: 2 * 60 * 1000, // 2分鐘緩存
  });
};

// 遠征成功率預測
export const useExpeditionSuccessRate = (playerAddress: string, dungeonId: number, partyPower: number) => {
  return useQuery({
    queryKey: ['expeditionSuccessRate', playerAddress, dungeonId, partyPower],
    queryFn: async () => {
      const query = `
        query GetExpeditionStats($player: Bytes!, $dungeonId: BigInt!) {
          expeditions(
            where: { 
              player: $player, 
              dungeonId: $dungeonId 
            },
            first: 20,
            orderBy: timestamp,
            orderDirection: desc
          ) {
            success
            partyPower
            dungeonPowerRequired
          }
          
          # 全局該地下城成功率
          expeditions(
            where: { dungeonId: $dungeonId },
            first: 100,
            orderBy: timestamp,
            orderDirection: desc
          ) {
            success
            partyPower
          }
        }
      `;

      const response = await graphQLRateLimiter.execute(() =>
        fetch(THE_GRAPH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            variables: { 
              player: playerAddress.toLowerCase(), 
              dungeonId: dungeonId.toString() 
            }
          })
        })
      );

      const { data } = await response.json();
      
      const personalHistory = data.expeditions?.slice(0, 20) || [];
      const globalHistory = data.expeditions || [];

      // 個人成功率
      const personalSuccessRate = personalHistory.length > 0
        ? (personalHistory.filter((e: any) => e.success).length / personalHistory.length) * 100
        : 0;

      // 相似戰力的全局成功率
      const similarPowerExpeditions = globalHistory.filter((e: any) => 
        Math.abs(parseInt(e.partyPower) - partyPower) < partyPower * 0.1 // 10% 範圍內
      );
      
      const similarPowerSuccessRate = similarPowerExpeditions.length > 0
        ? (similarPowerExpeditions.filter((e: any) => e.success).length / similarPowerExpeditions.length) * 100
        : 50;

      return {
        personalRate: Math.round(personalSuccessRate),
        similarPowerRate: Math.round(similarPowerSuccessRate),
        sampleSize: personalHistory.length,
        recommendation: similarPowerSuccessRate > 80 ? 'excellent' : 
                      similarPowerSuccessRate > 60 ? 'good' : 
                      similarPowerSuccessRate > 40 ? 'moderate' : 'difficult',
        powerComparison: personalHistory.length > 0 
          ? personalHistory[0].dungeonPowerRequired 
          : null
      };
    },
    enabled: !!playerAddress && dungeonId > 0,
    staleTime: 5 * 60 * 1000, // 5分鐘緩存
  });
};

// 智能建議文案
export const getSmartHint = (type: 'upgrade' | 'expedition', data: any) => {
  switch (type) {
    case 'upgrade':
      if (data.recommendation === 'recommended') {
        return {
          text: `基於你的 ${data.sampleSize} 次記錄，成功率約 ${data.personalRate}%`,
          color: 'text-green-400',
          icon: '🎯'
        };
      } else if (data.recommendation === 'risky') {
        return {
          text: `風險較高，你的成功率僅 ${data.personalRate}%`,
          color: 'text-red-400',
          icon: '⚠️'
        };
      } else {
        return {
          text: `全服平均成功率 ${data.globalRate}%`,
          color: 'text-gray-400',
          icon: '📊'
        };
      }

    case 'expedition':
      if (data.recommendation === 'excellent') {
        return {
          text: `絕佳選擇！相似戰力成功率 ${data.similarPowerRate}%`,
          color: 'text-green-400',
          icon: '⭐'
        };
      } else if (data.recommendation === 'difficult') {
        return {
          text: `挑戰難度高，建議提升戰力`,
          color: 'text-red-400',
          icon: '💪'
        };
      } else {
        return {
          text: `成功率約 ${data.similarPowerRate}%`,
          color: 'text-yellow-400',
          icon: '⚔️'
        };
      }
  }
};