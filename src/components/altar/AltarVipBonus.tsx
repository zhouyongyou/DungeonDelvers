// AltarVipBonus.tsx - VIP 加成顯示組件（顯示實際實現狀況）
import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContractWithABI } from '../../config/contractsWithABI';
import { useVipStatus } from '../../hooks/useVipStatus';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AltarVipBonusProps {
  className?: string;
}

export const AltarVipBonus: React.FC<AltarVipBonusProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const { vipLevel, taxReduction, isLoading: isVipLoading } = useVipStatus();
  
  const altarContract = getContractWithABI('ALTAROFASCENSION');
  
  // 讀取祭壇中的手動設置的 VIP 加成率
  const { data: vipBonusRate, isLoading: isBonusLoading } = useReadContract({
    ...altarContract,
    functionName: 'vipBonusRate',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!altarContract,
      staleTime: 1000 * 60 * 5, // 5分鐘緩存
    }
  });

  const isLoading = isVipLoading || isBonusLoading;
  const manualBonusRate = Number(vipBonusRate || 0);
  const autoVipBonus = vipLevel || 0; // 自動 VIP 加成（地下城模式）

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
          <div className="text-lg font-bold text-white">{Number(taxReduction) / 100}%</div>
        </div>
      </div>

      {/* 祭壇 VIP 加成狀況說明 */}
      <div className="bg-gradient-to-r from-orange-800/20 to-red-800/20 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-orange-400">⚠️</span>
          <span className="font-semibold text-orange-200">祭壇 VIP 加成狀況</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-orange-300">地下城加成</span>
            <span className="font-bold text-green-300">自動生效 +{autoVipBonus}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-orange-300">祭壇加成</span>
            <span className={`font-bold ${manualBonusRate > 0 ? 'text-green-300' : 'text-red-300'}`}>
              {manualBonusRate > 0 ? `手動設置 +${manualBonusRate}%` : '尚未設置 +0%'}
            </span>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-orange-500/20">
          <p className="text-xs text-orange-200 text-center">
            {manualBonusRate > 0 
              ? '🎉 您已獲得管理員設置的祭壇 VIP 加成！'
              : '🔧 祭壇 VIP 加成需要管理員手動設置才能生效'
            }
          </p>
        </div>
      </div>

      {/* 技術說明 */}
      <div className="bg-gradient-to-r from-gray-800/20 to-gray-700/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-400">🔧</span>
          <span className="font-semibold text-blue-200">技術實現差異</span>
        </div>
        <div className="space-y-1 text-xs text-gray-300">
          <p>• 地下城：自動讀取 VIP 等級並應用加成</p>
          <p>• 祭壇：使用管理員手動設置的加成率映射</p>
          <p>• 建議：升級祭壇合約以實現自動 VIP 加成</p>
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