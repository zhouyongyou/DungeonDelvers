import React from 'react';
import { Address } from 'viem';
import { useDungeonReveal } from '../../hooks/useDungeonReveal';
import { useCountdown } from '../../hooks/useCountdown';
import { ActionButton } from '../ui/ActionButton';

interface DungeonRevealStatusProps {
  userAddress?: Address;
  className?: string;
}

export const DungeonRevealStatus: React.FC<DungeonRevealStatusProps> = ({
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
  } = useDungeonReveal(userAddress);

  // Use countdown for blocks (assuming 3 seconds per block on BSC)
  const revealCountdown = useCountdown(blocksUntilReveal * 3);
  const expireCountdown = useCountdown(blocksUntilExpire * 3);

  // No pending expeditions
  if (!commitment || commitment.blockNumber === 0n || commitment.fulfilled) {
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
    if (canForceReveal) return '⚠️ 已過期 - 探險失敗';
    if (canReveal) return '✅ 可以揭示結果';
    return '⏳ 等待揭示';
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          🗺️ 待揭示的探險
        </h3>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">隊伍 ID</span>
          <span className="text-sm font-medium text-white">
            #{commitment.partyId.toString()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">地城等級</span>
          <span className="text-sm font-medium text-white">
            {commitment.dungeonId.toString()}
          </span>
        </div>

        {blocksUntilReveal > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">可揭示倒計時</span>
            <span className="text-sm font-medium text-yellow-400">
              {formatTime(revealCountdown)} ({blocksUntilReveal} 區塊)
            </span>
          </div>
        )}

        {canReveal && !canForceReveal && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">過期倒計時</span>
            <span className="text-sm font-medium text-orange-400">
              {formatTime(expireCountdown)} ({blocksUntilExpire} 區塊)
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
                style={{ width: `${(1 - blocksUntilReveal / 3) * 100}%` }}
              />
            ) : (
              <div 
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${(1 - blocksUntilExpire / 255) * 100}%` }}
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
            🎯 揭示探險結果
          </ActionButton>
        )}

        {canForceReveal && userAddress && (
          <ActionButton
            onClick={() => forceReveal(userAddress)}
            loading={isLoading}
            variant="danger"
            fullWidth
          >
            ⚠️ 強制揭示（探險失敗）
          </ActionButton>
        )}

        {!canReveal && !canForceReveal && (
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">
              揭示需要等待 {blocksUntilReveal} 個區塊
            </p>
            <p className="text-xs text-gray-500">
              BSC 約每 3 秒產生一個新區塊
            </p>
          </div>
        )}
      </div>

      {/* Warning for force reveal */}
      {canForceReveal && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded">
          <p className="text-xs text-red-400">
            ⚠️ 注意：過期未揭示的探險將失敗，無法獲得獎勵。
            請確保在時限內揭示探險結果。
          </p>
        </div>
      )}
    </div>
  );
};