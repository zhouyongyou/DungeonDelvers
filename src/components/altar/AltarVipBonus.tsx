// AltarVipBonus.tsx - VIP 加成顯示組件
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
  
  // 讀取祭壇中的 VIP 加成率
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
  const bonusRate = Number(vipBonusRate || 0);

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

  // 沒有 VIP 等級或加成
  if (vipLevel === 0 && bonusRate === 0) {
    return (
      <div className={`bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-600/30 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👤</span>
            <div>
              <h4 className="font-semibold text-gray-300">普通用戶</h4>
              <p className="text-sm text-gray-400">無 VIP 加成</p>
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

  // 有 VIP 加成
  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👑</span>
          <div>
            <h4 className="font-semibold text-purple-300">VIP {vipLevel} 會員</h4>
            <p className="text-sm text-purple-400">尊貴身份加成</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-purple-300">+{bonusRate}%</div>
          <div className="text-xs text-purple-400">成功率加成</div>
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

      {/* 升星加成說明 */}
      <div className="bg-gradient-to-r from-purple-800/20 to-pink-800/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-yellow-400">✨</span>
          <span className="font-semibold text-purple-200">升星特權</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-purple-300">普通成功率加成</span>
            <span className="font-bold text-green-300">+{bonusRate}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-purple-300">大成功率</span>
            <span className="font-bold text-purple-300">不變</span>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-purple-500/20">
          <p className="text-xs text-purple-200 text-center">
            🌟 VIP 加成只影響普通成功率，大成功率保持原樣以維持平衡
          </p>
        </div>
      </div>

      {/* 升級提示 */}
      {vipLevel < 10 && (
        <div className="mt-3 p-2 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-200 text-center">
            🚀 質押更多 SoulShard 提升 VIP 等級，獲得更高加成！
          </p>
        </div>
      )}
    </div>
  );
};