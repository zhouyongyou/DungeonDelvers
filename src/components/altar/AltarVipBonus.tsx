// AltarVipBonus.tsx - VIP 加成顯示組件（增強型摺疊面板）
import React, { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContractWithABI } from '../../config/contractsWithABI';
import { useVipStatus } from '../../hooks/useVipStatus';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AltarVipBonusProps {
  className?: string;
}

export const AltarVipBonus: React.FC<AltarVipBonusProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const { vipLevel, taxReduction, isLoading: isVipLoading } = useVipStatus();
  const { isAdmin } = useAdminAccess();
  
  // 摺疊狀態管理
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  
  const altarContract = getContractWithABI('ALTAROFASCENSION');
  
  // 讀取玩家 VIP 信息（新版合約 V2Fixed）
  const { data: playerVipInfo, isLoading: isBonusLoading } = useReadContract({
    ...altarContract,
    functionName: 'getPlayerVipInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!altarContract,
      staleTime: 1000 * 60 * 5, // 5分鐘緩存
    }
  });

  const isLoading = isVipLoading || isBonusLoading;
  
  // 解析 VIP 信息：[currentVipLevel, additionalBonus, totalVipBonus, effectiveTotalBonus]
  const currentVipLevel = playerVipInfo ? Number(playerVipInfo[0]) : 0;
  const additionalBonus = playerVipInfo ? Number(playerVipInfo[1]) : 0;
  const totalVipBonus = playerVipInfo ? Number(playerVipInfo[2]) : 0;
  const effectiveVipBonus = playerVipInfo ? Number(playerVipInfo[3]) : 0;
  
  const autoVipBonus = vipLevel || 0; // 地下城使用的自動 VIP 加成

  if (!address) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <LoadingSpinner size="sm" />
          <span className="text-purple-300 text-sm">檢查 VIP 加成中...</span>
        </div>
      </div>
    );
  }

  // 沒有 VIP 等級的情況
  if (vipLevel === 0) {
    return (
      <div className={`bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-600/30 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👤</span>
            <div>
              <h4 className="font-semibold text-gray-300">普通用戶</h4>
              <p className="text-sm text-gray-400">未質押 VIP</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-400">+0%</div>
            <div className="text-xs text-gray-500">成功率加成</div>
          </div>
        </div>
        
        <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-200 text-center">
            💎 質押 SoulShard 成為 VIP，享受升星成功率加成！
          </p>
        </div>
      </div>
    );
  }

  // 有 VIP 等級的情況
  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👑</span>
          <div>
            <h4 className="font-semibold text-purple-300">VIP {vipLevel} 會員</h4>
            <p className="text-sm text-purple-400">尊貴身份</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-purple-300">VIP {vipLevel}</div>
          <div className="text-xs text-purple-400">等級</div>
        </div>
      </div>

      {/* VIP 特權說明 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-purple-900/20 rounded-lg p-2 text-center">
          <div className="text-sm font-semibold text-purple-300">VIP 等級</div>
          <div className="text-lg font-bold text-white">{vipLevel}</div>
        </div>
        <div className="bg-pink-900/20 rounded-lg p-2 text-center">
          <div className="text-sm font-semibold text-pink-300">稅率減免</div>
          <div className="text-lg font-bold text-white">{(Number(taxReduction) / 10000 * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* 祭壇 VIP 加成狀況說明 - 增強型摺疊面板 */}
      <div className="bg-gradient-to-r from-green-800/20 to-emerald-800/20 rounded-lg p-3 mb-3">
        {/* 標題和摺疊按鈕 */}
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-green-800/20 rounded-lg p-2 -m-2 transition-colors"
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-green-400">✨</span>
            <span className="font-semibold text-green-200">祭壇 VIP 加成</span>
            <span className="font-bold text-yellow-300">+{effectiveVipBonus}%</span>
          </div>
          <button className="text-green-300 hover:text-green-200 transition-transform">
            <span className={`transform transition-transform ${isDetailsExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>
        
        {/* 摺疊內容 */}
        <div className={`overflow-hidden transition-all duration-300 ${
          isDetailsExpanded ? 'max-h-screen opacity-100 mt-3' : 'max-h-0 opacity-0'
        }`}>
          {!isAdmin ? (
            /* 普通用戶：簡化顯示 */
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-green-300">當前 VIP 等級</span>
                <span className="font-bold text-white">等級 {currentVipLevel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-300">升星成功率加成</span>
                <span className="font-bold text-yellow-300">+{effectiveVipBonus}%</span>
              </div>
              <div className="mt-2 pt-2 border-t border-green-500/20">
                <p className="text-xs text-green-200 text-center">
                  {effectiveVipBonus > 0 
                    ? '🎉 VIP 加成自動生效中！'
                    : '👤 質押 SoulShard 成為 VIP 以獲得加成'
                  }
                </p>
              </div>
            </div>
          ) : (
            /* 管理員：詳細顯示 */
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-orange-300">地下城加成</span>
                <span className="font-bold text-green-300">自動生效 +{autoVipBonus}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-orange-300">VIP 等級加成</span>
                <span className="font-bold text-green-300">+{currentVipLevel}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-orange-300">神秘額外加成</span>
                <span className={`font-bold ${
                  additionalBonus > 0 ? 'text-green-300' : 'text-gray-400'
                }`}>
                  +{additionalBonus}%
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-orange-500/20 pt-1 mt-2">
                <span className="text-orange-200 font-semibold">總加成</span>
                <span className="font-bold text-yellow-300">+{effectiveVipBonus}%</span>
              </div>
              <div className="mt-2 pt-2 border-t border-orange-500/20">
                <p className="text-xs text-orange-200 text-center">
                  {effectiveVipBonus > currentVipLevel 
                    ? `🎉 您獲得了 +${additionalBonus}% 神秘額外加成！`
                    : effectiveVipBonus === currentVipLevel && currentVipLevel > 0
                      ? '✅ VIP 等級加成自動生效中'
                      : '👤 質押 SoulShard 成為 VIP 以獲得加成'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 技術說明 - 根據權限顯示不同內容 */}
      <div className="bg-gradient-to-r from-gray-800/20 to-gray-700/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-400">💡</span>
          <span className="font-semibold text-blue-200">
            {isAdmin ? '技術實現詳情' : 'VIP 機制說明'}
          </span>
        </div>
        <div className="space-y-1 text-xs text-gray-300">
          {isAdmin ? (
            // 管理員：詳細技術資訊
            <>
              <p>• 地下城：自動讀取 VIP 等級並應用加成</p>
              <p>• 祭壇：現在也支援自動 VIP 等級加成了！</p>
              <p>• 上限：總加成上限 20%，神秘額外加成上限 20%</p>
            </>
          ) : (
            // 普通用戶：簡化說明
            <>
              <p>• VIP 等級根據質押的 SoulShard 數量自動計算</p>
              <p>• 升星成功率加成會自動應用到所有祭壇操作</p>
              <p>• 更高的 VIP 等級提供更好的成功率加成</p>
            </>
          )}
        </div>
      </div>

      {/* 升級提示 */}
      {vipLevel < 10 && (
        <div className="mt-3 p-2 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-200 text-center">
            🚀 質押更多 SoulShard 提升 VIP 等級，地下城加成會自動增加！
          </p>
        </div>
      )}
    </div>
  );
};