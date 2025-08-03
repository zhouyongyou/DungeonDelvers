import React from 'react';
import { useAltarReveal } from '../../hooks/useAltarReveal';
import { useCountdown } from '../../hooks/useCountdown';
import { ActionButton } from '../ui/ActionButton';

interface AltarRevealStatusProps {
  userAddress?: `0x${string}`;
  className?: string;
}

export const AltarRevealStatus: React.FC<AltarRevealStatusProps> = ({
  userAddress,
  className = '',
}) => {
  const {
    commitment,
    canReveal,
    canForceReveal,
    blocksUntilReveal,
    blocksUntilExpire,
    isLoading,
    reveal,
    forceReveal,
    refetch,
  } = useAltarReveal(userAddress);

  // 修正：BSC 每個區塊約 0.75 秒（不是 3 秒）
  const BSC_BLOCK_TIME = 0.75; // 秒
  
  // 計算絕對時間戳用於倒計時（始終調用 Hook，即使組件可能不渲染）
  const now = Math.floor(Date.now() / 1000);
  const revealTargetTime = now + (blocksUntilReveal * BSC_BLOCK_TIME);
  const expireTargetTime = now + (blocksUntilExpire * BSC_BLOCK_TIME);
  const revealCountdown = useCountdown(revealTargetTime);
  const expireCountdown = useCountdown(expireTargetTime);

  // 調試日誌
  console.log('[AltarRevealStatus] commitment:', commitment);
  console.log('[AltarRevealStatus] blocksUntilReveal:', blocksUntilReveal);
  console.log('[AltarRevealStatus] canReveal:', canReveal);

  // 在數據載入期間顯示載入狀態
  if (!commitment) {
    // 仍在載入中，顯示骨架載入效果
    return (
      <div className={`bg-gray-800 rounded-lg p-4 animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-gray-700 rounded w-24"></div>
          <div className="h-4 bg-gray-700 rounded w-20"></div>
        </div>
        <div className="h-20 bg-gray-700 rounded"></div>
      </div>
    );
  }

  // No pending upgrades - 條件檢查移到 Hook 調用之後
  if (commitment.blockNumber === 0n || commitment.fulfilled) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (canForceReveal) return 'text-red-500';
    if (canReveal) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getStatusText = () => {
    if (canForceReveal) return '⚠️ 已過期 - 升級失敗';
    if (canReveal) return '✅ 可以揭示結果';
    return '⏳ 等待揭示';
  };

  const getRarityDisplay = (rarity: number) => {
    return '★'.repeat(rarity);
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          ⚗️ 待揭示的升級
        </h3>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">升級稀有度</span>
          <span className="text-sm font-medium text-yellow-400">
            {getRarityDisplay(commitment.rarity)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">材料數量</span>
          <span className="text-sm font-medium text-white">
            {commitment.materialsCount} 個
          </span>
        </div>

        {blocksUntilReveal > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">可揭示倒計時</span>
            <span className="text-sm font-medium text-yellow-400">
              {revealCountdown.formatted} ({blocksUntilReveal} 區塊)
            </span>
          </div>
        )}
        
        {blocksUntilReveal === 0 && !canReveal && !canForceReveal && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">狀態</span>
            <span className="text-sm font-medium text-green-400">
              可以揭示！
            </span>
          </div>
        )}

        {canReveal && !canForceReveal && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">過期倒計時</span>
            <span className="text-sm font-medium text-orange-400">
              {expireCountdown.formatted} ({blocksUntilExpire} 區塊)
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!canForceReveal && (
        <div className="mb-4">
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            {blocksUntilReveal > 0 ? (
              <div 
                className="bg-yellow-500 h-full transition-all duration-300"
                style={{ width: `${(1 - blocksUntilReveal / 4) * 100}%` }}
              />
            ) : (
              <div 
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${(1 - blocksUntilExpire / 259) * 100}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {canReveal && !canForceReveal && (
          <ActionButton
            onClick={reveal}
            loading={isLoading}
            variant="primary"
            fullWidth
          >
            🎯 揭示升級結果
          </ActionButton>
        )}

        {canForceReveal && userAddress && (
          <ActionButton
            onClick={() => forceReveal(userAddress)}
            loading={isLoading}
            variant="danger"
            fullWidth
          >
            ⚠️ 強制揭示（升級失敗）
          </ActionButton>
        )}

        {!canReveal && !canForceReveal && blocksUntilReveal > 0 && (
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">
              揭示需要等待 {blocksUntilReveal} 個區塊
            </p>
            <p className="text-xs text-gray-500">
              BSC 約每 {BSC_BLOCK_TIME} 秒產生一個新區塊
            </p>
          </div>
        )}
        
        {!canReveal && !canForceReveal && blocksUntilReveal === 0 && (
          <ActionButton
            onClick={() => {
              refetch();
              window.location.reload(); // 強制刷新頁面以獲取最新狀態
            }}
            variant="secondary"
            fullWidth
          >
            🔄 刷新狀態
          </ActionButton>
        )}
      </div>

      {/* Warning for force reveal */}
      {canForceReveal && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded">
          <p className="text-xs text-red-400">
            ⚠️ 注意：過期未揭示的升級將失敗，所有材料已被燃燒。
            請確保在時限內揭示升級結果。
          </p>
        </div>
      )}
    </div>
  );
};