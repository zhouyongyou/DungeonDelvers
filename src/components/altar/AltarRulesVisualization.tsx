// AltarRulesVisualization.tsx - 升星規則視覺化組件
import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContractWithABI } from '../../config/contractsWithABI';
import { useVipStatus } from '../../hooks/useVipStatus';

interface RuleData {
  materialsRequired: number;
  nativeFee: bigint;
  greatSuccessChance: number;
  successChance: number;
  partialFailChance: number;
}

interface AltarRulesVisualizationProps {
  rule: RuleData | null;
  targetRarity: number;
  isLoading?: boolean;
}

export const AltarRulesVisualization: React.FC<AltarRulesVisualizationProps> = ({
  rule,
  targetRarity,
  isLoading = false
}) => {
  const { address } = useAccount();
  const { vipLevel } = useVipStatus();
  
  const altarContract = getContractWithABI('ALTAROFASCENSION');
  
  // 讀取玩家 VIP 信息（新版合約）
  const { data: playerVipInfo } = useReadContract({
    ...altarContract,
    functionName: 'getPlayerVipInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!altarContract,
      staleTime: 1000 * 60 * 5,
    }
  });

  // 解析 VIP 信息：[currentVipLevel, additionalBonus, totalVipBonus, effectiveTotalBonus]
  const bonusRate = playerVipInfo ? Number(playerVipInfo[3]) : 0; // 使用 effectiveTotalBonus
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-purple-400/20 rounded-lg w-2/3"></div>
          <div className="w-32 h-32 bg-purple-400/20 rounded-full mx-auto"></div>
          <div className="space-y-2">
            <div className="h-4 bg-purple-400/20 rounded w-full"></div>
            <div className="h-4 bg-purple-400/20 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-md border border-gray-600/20 rounded-2xl p-6 text-center">
        <div className="text-gray-400 text-lg">🔮</div>
        <p className="text-gray-500 mt-2">選擇升級目標以查看神秘預言</p>
      </div>
    );
  }

  // 優化後的成功率（暫時顯示）+ VIP 加成
  const optimizedRules = {
    1: { greatSuccessChance: 10, successChance: 90, totalFailChance: 0 },
    2: { greatSuccessChance: 8, successChance: 92, totalFailChance: 0 },
    3: { greatSuccessChance: 5, successChance: 85, totalFailChance: 10 },
    4: { greatSuccessChance: 3, successChance: 77, totalFailChance: 20 },
  };

  const baseRule = optimizedRules[targetRarity as keyof typeof optimizedRules] || {
    greatSuccessChance: rule.greatSuccessChance,
    successChance: rule.successChance,
    totalFailChance: rule.partialFailChance
  };

  // 應用 VIP 加成到成功率（只影響普通成功率）
  const displayRule = {
    ...baseRule,
    // 調整成功率，但確保總成功率不超過100%
    successChance: Math.min(baseRule.successChance + bonusRate, 100 - baseRule.greatSuccessChance),
    // 大成功率不變
    greatSuccessChance: baseRule.greatSuccessChance,
    // 調整失敗率（如果有的話）
    totalFailChance: Math.max(baseRule.totalFailChance - bonusRate, 0)
  };

  const totalSuccess = displayRule.greatSuccessChance + displayRule.successChance;
  const totalFail = displayRule.totalFailChance;

  // 計算圓形進度條的參數
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const greatSuccessOffset = circumference - (displayRule.greatSuccessChance / 100) * circumference;
  const successOffset = circumference - (displayRule.successChance / 100) * circumference;

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
      {/* 背景粒子效果 */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <h3 className="text-xl font-bold text-center mb-6 bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">
          ⚜️ 升星神諭 ⚜️
        </h3>

        {/* 成功率圓形圖表 */}
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
              {/* 背景圓 */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                fill="none"
                stroke="rgb(55, 65, 81)"
                strokeWidth="8"
                opacity="0.3"
              />
              
              {/* 失敗區域 */}
              {totalFail > 0 && (
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  fill="none"
                  stroke="rgb(239, 68, 68)"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (totalFail / 100) * circumference}
                  opacity="0.7"
                />
              )}
              
              {/* 普通成功區域 */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                fill="none"
                stroke="rgb(34, 197, 94)"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={successOffset}
                opacity="0.8"
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  transform: `rotate(${totalFail * 3.6}deg)`,
                  transformOrigin: '72px 72px'
                }}
              />
              
              {/* 大成功區域 */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                fill="none"
                stroke="rgb(168, 85, 247)"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={greatSuccessOffset}
                opacity="0.9"
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  transform: `rotate(${(totalFail + displayRule.successChance) * 3.6}deg)`,
                  transformOrigin: '72px 72px'
                }}
              />
            </svg>
            
            {/* 中心文字 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalSuccess}%</div>
                <div className="text-xs text-purple-300">總成功率</div>
              </div>
            </div>
          </div>
        </div>

        {/* 詳細規則說明 */}
        <div className="space-y-3 text-sm">
          <div className="bg-black/20 rounded-lg p-3 border border-purple-500/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-300">🔮 所需祭品</span>
              <span className="font-bold text-white">{rule.materialsRequired} 個同星級</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-purple-300">💎 儀式費用</span>
              <span className="font-bold text-yellow-400">免費</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-purple-300">⚜️ 神跡降臨</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-purple-300">{displayRule.greatSuccessChance}%</div>
                <div className="text-xs text-purple-400">獲得 2 個 {targetRarity + 1}★</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-green-900/20 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-300">✨ 祝福成功</span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <span className="font-bold text-green-300">{displayRule.successChance}%</span>
                  {bonusRate > 0 && (
                    <span className="text-xs text-yellow-400 bg-yellow-900/20 px-1 rounded">
                      +{bonusRate}% VIP
                    </span>
                  )}
                </div>
                <div className="text-xs text-green-400">獲得 1 個 {targetRarity + 1}★</div>
              </div>
            </div>

            {totalFail > 0 && (
              <div className="flex items-center justify-between p-2 bg-red-900/20 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-red-300">💀 祭品消散</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-300">{totalFail}%</div>
                  <div className="text-xs text-red-400">失去所有材料</div>
                </div>
              </div>
            )}
          </div>

          {/* 優化版本提示 */}
          {targetRarity <= 2 && (
            <div className="mt-4 p-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-400">🛡️</span>
                <span className="font-semibold text-green-300">新手保護</span>
              </div>
              <p className="text-xs text-green-200">
                前兩星級保證成功，無失敗風險！讓新手玩家安心體驗升星樂趣。
              </p>
            </div>
          )}
        </div>

        {/* 神秘氛圍文字 */}
        <div className="mt-4 text-center">
          <p className="text-xs text-purple-400/80 italic">
            "命運的齒輪已經轉動，祭品的力量將決定你的未來..."
          </p>
        </div>
      </div>
    </div>
  );
};