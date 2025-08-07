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
  cooldownTime?: bigint;
  isActive?: boolean;
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

  // 使用合約實際規則（從 props 傳入的 rule 數據）
  const baseRule = {
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

  // 計算顯示數據
  const totalSuccess = displayRule.greatSuccessChance + displayRule.successChance;
  const totalFail = displayRule.totalFailChance;

  return (
    <div className={`backdrop-blur-md border rounded-2xl p-6 relative overflow-hidden ${
      rule.isActive 
        ? 'bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-500/20' 
        : 'bg-gradient-to-br from-gray-900/50 to-red-900/20 border-red-500/30'
    }`}>
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
        {/* 規則停用警告 */}
        {!rule.isActive && (
          <div className="bg-red-900/50 border border-red-400/50 rounded-lg p-3 mb-4 text-center">
            <div className="text-red-300 font-semibold">🚫 此升星規則已停用</div>
            <div className="text-red-400 text-sm mt-1">升級功能暫時關閉</div>
          </div>
        )}
        
        <h3 className={`text-xl font-bold text-center mb-6 bg-gradient-to-r bg-clip-text text-transparent ${
          rule.isActive 
            ? 'from-purple-300 to-indigo-300' 
            : 'from-gray-400 to-red-400'
        }`}>
          ⚜️ 升星神諭 ⚜️
        </h3>

        {/* 機率可視化 - 橫向進度條 */}
        <div className="mb-6">
          {/* 總成功率顯示 */}
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-white">{totalSuccess}%</div>
            <div className="text-sm text-purple-300">總成功率</div>
          </div>
          
          {/* 機率分解 */}
          <div className="space-y-3">
            {/* 神跡降臨 */}
            <div className="bg-black/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">⚜️</span>
                  <span className="text-sm text-purple-300">神跡降臨</span>
                </div>
                <span className="font-bold text-purple-400">{displayRule.greatSuccessChance}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${displayRule.greatSuccessChance}%` }}
                />
              </div>
              <div className="text-xs text-purple-200 mt-1">獲得 2 個 {targetRarity}★</div>
            </div>

            {/* 祝福成功 */}
            <div className="bg-black/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✨</span>
                  <span className="text-sm text-green-300">祝福成功</span>
                  {bonusRate > 0 && (
                    <span className="text-xs text-yellow-400">+{bonusRate}% VIP</span>
                  )}
                </div>
                <span className="font-bold text-green-400">{displayRule.successChance}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${displayRule.successChance}%` }}
                />
              </div>
              <div className="text-xs text-green-200 mt-1">獲得 1 個 {targetRarity}★</div>
            </div>

            {/* 失敗風險 */}
            {totalFail > 0 && (
              <div className="bg-black/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">💀</span>
                    <span className="text-sm text-red-300">祭品消散</span>
                  </div>
                  <span className="font-bold text-red-400">{totalFail}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-400 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${totalFail}%` }}
                  />
                </div>
                <div className="text-xs text-red-200 mt-1">失去所有祭品材料</div>
              </div>
            )}
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
            {rule.cooldownTime && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-purple-300">⏱️ 冷卻時間</span>
                <span className="font-bold text-blue-400">{Number(rule.cooldownTime) / 3600} 小時</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-purple-300">🔮 規則狀態</span>
              <span className={`font-bold ${rule.isActive ? 'text-green-400' : 'text-red-400'}`}>
                {rule.isActive ? '✅ 啟用' : '🚫 停用'}
              </span>
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