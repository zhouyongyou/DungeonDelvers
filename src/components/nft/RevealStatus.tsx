import React from 'react';
import { useCommitReveal } from '../../hooks/useCommitReveal';
import { useCountdown } from '../../hooks/useCountdown';
import { ActionButton } from '../ui/ActionButton';

interface RevealStatusProps {
  contractType: 'hero' | 'relic';
  userAddress?: `0x${string}`;
  className?: string;
}

export const RevealStatus: React.FC<RevealStatusProps> = ({
  contractType,
  userAddress,
  className = '',
}) => {
  const {
    commitment,
    pendingTokens,
    canReveal,
    canForceReveal,
    blocksUntilReveal,
    blocksUntilExpire,
    isLoading,
    reveal,
    forceReveal,
  } = useCommitReveal(contractType, userAddress);

  // 修正：BSC 每個區塊約 0.75 秒（不是 3 秒）
  const BSC_BLOCK_TIME = 0.75; // 秒
  
  // 計算絕對時間戳用於倒計時（始終調用 Hook，即使組件可能不渲染）
  const now = Math.floor(Date.now() / 1000);
  const revealTargetTime = now + (blocksUntilReveal * BSC_BLOCK_TIME);
  const expireTargetTime = now + (blocksUntilExpire * BSC_BLOCK_TIME);
  const revealCountdown = useCountdown(revealTargetTime);
  const expireCountdown = useCountdown(expireTargetTime);

  // No pending mints - 條件檢查移到 Hook 調用之後
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
    if (canForceReveal) return '⚠️ 已過期 - 需要強制揭示';
    if (canReveal) return '✅ 可以揭示';
    return '⏳ 等待揭示';
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">
          待揭示 {contractType === 'hero' ? '英雄' : '聖物'}
        </h3>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">數量</span>
          <span className="text-sm font-medium text-white">
            {commitment.quantity.toString()} 個
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">最高稀有度</span>
          <span className="text-sm font-medium text-white">
            {'★'.repeat(commitment.maxRarity)}
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
        
        {blocksUntilReveal === 0 && !canReveal && (
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

        {pendingTokens.length > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Token IDs</span>
            <span className="text-sm font-medium text-white">
              #{pendingTokens.map(id => id.toString()).join(', #')}
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
            🎯 揭示我的 {contractType === 'hero' ? '英雄' : '聖物'}
          </ActionButton>
        )}

        {canForceReveal && userAddress && (
          <ActionButton
            onClick={() => forceReveal(userAddress)}
            loading={isLoading}
            variant="danger"
            fullWidth
          >
            ⚠️ 強制揭示（保底稀有度分布）
          </ActionButton>
        )}

        {!canReveal && !canForceReveal && (
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">
              揭示需要等待 {blocksUntilReveal} 個區塊
            </p>
            <p className="text-xs text-gray-500">
              BSC 約每 {BSC_BLOCK_TIME} 秒產生一個新區塊
            </p>
          </div>
        )}
      </div>

      {/* Warning for force reveal */}
      {canForceReveal && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded">
          <div className="text-xs text-red-400 mb-2">
            ⚠️ 強制揭示保底分布（{commitment.quantity.toString()} 個）：
          </div>
          <div className="text-xs text-gray-300 space-y-1">
            {commitment.quantity.toString() === '50' ? (
              <>
                <div>• 25 個 1星 ⭐</div>
                <div>• 16 個 2星 ⭐⭐</div>
                <div>• 8 個 3星 ⭐⭐⭐</div>
                <div>• 1 個 4星 ⭐⭐⭐⭐</div>
              </>
            ) : commitment.quantity.toString() === '20' ? (
              <>
                <div>• 11 個 1星 ⭐</div>
                <div>• 6 個 2星 ⭐⭐</div>
                <div>• 3 個 3星 ⭐⭐⭐</div>
              </>
            ) : commitment.quantity.toString() === '10' ? (
              <>
                <div>• 6 個 1星 ⭐</div>
                <div>• 3 個 2星 ⭐⭐</div>
                <div>• 1 個 3星 ⭐⭐⭐</div>
              </>
            ) : commitment.quantity.toString() === '5' ? (
              <>
                <div>• 3 個 1星 ⭐</div>
                <div>• 2 個 2星 ⭐⭐</div>
              </>
            ) : (
              <div>• 1 個 1星 ⭐</div>
            )}
          </div>
          <div className="text-xs text-red-400 mt-2">
            任何人都可以幫您強制揭示過期的鑄造。
          </div>
        </div>
      )}
    </div>
  );
};