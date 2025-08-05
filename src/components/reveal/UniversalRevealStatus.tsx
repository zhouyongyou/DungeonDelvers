import React from 'react';
import { useCommitReveal } from '../../hooks/useCommitReveal';
import { useAltarReveal } from '../../hooks/useAltarReveal';
import { useDungeonReveal } from '../../hooks/useDungeonReveal';
import { useCountdown } from '../../hooks/useCountdown';
import { ActionButton } from '../ui/ActionButton';
import { useAccount } from 'wagmi';

type RevealType = 'mint' | 'altar' | 'dungeon';

interface UniversalRevealStatusProps {
  revealType: RevealType;
  contractType?: 'hero' | 'relic'; // Only for mint
  userAddress?: `0x${string}`;
  className?: string;
  collapsible?: boolean; // 是否可摺疊
  defaultExpanded?: boolean; // 預設是否展開
}

export const UniversalRevealStatus: React.FC<UniversalRevealStatusProps> = ({
  revealType,
  contractType = 'hero',
  userAddress,
  className = '',
  collapsible = false,
  defaultExpanded = false,
}) => {
  // 根據類型選擇調用哪個 hook
  // 為避免違反 hooks 規則，都要調用但設置 enabled 參數
  const mintData = useCommitReveal(
    contractType, 
    revealType === 'mint' ? userAddress : undefined
  );
  const altarData = useAltarReveal(
    revealType === 'altar' ? userAddress : undefined
  );
  const dungeonData = useDungeonReveal(
    revealType === 'dungeon' ? userAddress : undefined
  );
  const data = revealType === 'mint' ? mintData : revealType === 'altar' ? altarData : dungeonData;
  const currentCommitment = data?.commitment;
  const hasPendingCommitment = currentCommitment && currentCommitment.blockNumber !== 0n && !currentCommitment.fulfilled;
  
  // 智能預設狀態：有待揭示內容時自動展開
  const [isExpanded, setIsExpanded] = React.useState(() => {
    if (collapsible && hasPendingCommitment) {
      return true; // 有待揭示內容時自動展開
    }
    return defaultExpanded; // 否則使用預設值
  });
  
  // 當有新的待揭示內容時自動展開
  React.useEffect(() => {
    if (collapsible && hasPendingCommitment && !isExpanded) {
      setIsExpanded(true);
    }
  }, [hasPendingCommitment, collapsible, isExpanded]);
  
  // 由於上面已經呼叫過了，這裡不再重複呼叫
  // Select the correct data based on reveal type
  // const data = revealType === 'mint' ? mintData : revealType === 'altar' ? altarData : dungeonData;
  
  const { address: connectedAddress } = useAccount();
  
  const {
    commitment: hookCommitment,
    canReveal = false,
    canForceReveal = false,
    blocksUntilReveal = 0,
    blocksUntilExpire = 0,
    isLoading = false,
    reveal,
    forceReveal, 
    revealFor,
    refetch = () => {},
  } = data || {};
  
  // 手動揭示函數（當沒有檢測到承諾時使用）
  const handleManualReveal = async () => {
    if (!data?.reveal) {
      console.warn('Reveal function not available');
      return;
    }
    await data.reveal();
  };
  
  const handleForceReveal = async () => {
    if (!data?.forceReveal) {
      console.warn('Force reveal function not available');
      return;
    }
    // 使用連接的地址或傳入的地址
    const targetAddress = userAddress || connectedAddress;
    if (targetAddress) {
      await data.forceReveal(targetAddress);
    }
  };
  
  // 使用統一的 commitment 引用
  const commitment = hookCommitment || currentCommitment;

  // BSC block time
  const BSC_BLOCK_TIME = 0.75; // seconds
  
  // 使用 useMemo 來穩定計算目標時間，避免每次渲染都重新計算
  const { revealTargetTime, expireTargetTime } = React.useMemo(() => {
    // 基於剩餘區塊數計算秒數，添加安全檢查
    const now = Math.floor(Date.now() / 1000);
    const revealSecondsRemaining = (blocksUntilReveal || 0) * BSC_BLOCK_TIME;
    const expireSecondsRemaining = (blocksUntilExpire || 0) * BSC_BLOCK_TIME;
    
    return {
      revealTargetTime: now + revealSecondsRemaining,
      expireTargetTime: now + expireSecondsRemaining
    };
  }, [blocksUntilReveal, blocksUntilExpire]);
  
  const revealCountdown = useCountdown(revealTargetTime);
  const expireCountdown = useCountdown(expireTargetTime);

  // 調試日誌 - 僅在開發環境且有重要變化時記錄（減少頻率）
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && commitment) {
      console.log(`[UniversalRevealStatus ${revealType}] Debug Info:`, {
        commitment,
        canReveal,
        canForceReveal,
        blocksUntilReveal,
        blocksUntilExpire,
        userAddress,
      });
      
      // 特別檢查地下城數據
      if (revealType === 'dungeon') {
        console.log(`[UniversalRevealStatus dungeon] Detailed commitment:`, {
          partyId: commitment?.partyId,
          dungeonId: commitment?.dungeonId,
          blockNumber: commitment?.blockNumber,
          fulfilled: commitment?.fulfilled,
        });
      }
    }
  }, [commitment?.blockNumber, canReveal, canForceReveal, revealType, blocksUntilReveal, blocksUntilExpire, userAddress]);

  // 移除 early return，讓手動揭示按鈕能夠顯示
  // if (!data) return null;

  // Helper functions - 定義所有輔助函數
  const getTitle = () => {
    switch (revealType) {
      case 'mint':
        return `🎲 待揭示的 ${contractType === 'hero' ? '英雄' : '聖物'}`;
      case 'altar':
        return '⚗️ 待揭示的升級';
      case 'dungeon':
        return '🗺️ 待揭示的探險';
    }
  };

  const getStatusColor = () => {
    if (canForceReveal) return 'text-red-500';
    if (canReveal) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getStatusText = () => {
    if (canForceReveal) return '⚠️ 已過期';
    if (canReveal) return '✅ 可以揭示';
    return '⏳ 等待揭示';
  };

  const getDetailDisplay = () => {
    // 鑄造頁面 - 結構化數據
    if (revealType === 'mint' && commitment && 'quantity' in commitment) {
      return (
        <>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">數量</span>
            <span className="text-sm font-medium text-white">
              {commitment.quantity.toString()} 個
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">最高稀有度</span>
            <span className="text-sm font-medium text-yellow-400">
              {'★'.repeat(commitment.maxRarity || 0)}
            </span>
          </div>
        </>
      );
    }

    // 升星頁面 - hook 已經解析成對象
    if (revealType === 'altar' && commitment) {
      // altarData 的 commitment 已經被 useAltarReveal 解析成對象
      const altarCommitment = commitment as any;
      return (
        <>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">升級稀有度</span>
            <span className="text-sm font-medium text-yellow-400">
              {'★'.repeat(altarCommitment.baseRarity || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">升級承諾</span>
            <span className="text-sm font-medium text-white">
              已提交
            </span>
          </div>
        </>
      );
    }

    // 地下城頁面 - hook 已經解析成對象
    if (revealType === 'dungeon' && commitment) {
      // dungeonData 的 commitment 已經被 useDungeonReveal 解析成對象
      const dungeonCommitment = commitment as any;
      
      // 安全的 bigint 轉字符串函數
      const safeToString = (value: any) => {
        if (value === null || value === undefined) return 'N/A';
        return value.toString();
      };
      
      return (
        <>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">隊伍 ID</span>
            <span className="text-sm font-medium text-white">
              #{safeToString(dungeonCommitment.partyId)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">地城等級</span>
            <span className="text-sm font-medium text-white">
              {safeToString(dungeonCommitment.dungeonId)}
            </span>
          </div>
        </>
      );
    }

    return null;
  };

  const getActionButtonText = () => {
    switch (revealType) {
      case 'mint':
        return `🎯 揭示我的${contractType === 'hero' ? '英雄' : '聖物'}`;
      case 'altar':
        return '🎯 揭示升級結果';
      case 'dungeon':
        return '🎯 揭示探險結果';
    }
  };

  const getForceRevealWarning = () => {
    if (revealType === 'mint' && 'quantity' in commitment) {
      const qty = commitment.quantity.toString();
      return (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded">
          <div className="text-xs text-red-400 mb-2">
            ⚠️ 強制揭示保底分布（{qty} 個）：
          </div>
          <div className="text-xs text-gray-300 space-y-1">
            {qty === '50' ? (
              <>
                <div>• 25 個 1星 ⭐</div>
                <div>• 16 個 2星 ⭐⭐</div>
                <div>• 8 個 3星 ⭐⭐⭐</div>
                <div>• 1 個 4星 ⭐⭐⭐⭐</div>
              </>
            ) : qty === '20' ? (
              <>
                <div>• 11 個 1星 ⭐</div>
                <div>• 6 個 2星 ⭐⭐</div>
                <div>• 3 個 3星 ⭐⭐⭐</div>
              </>
            ) : qty === '10' ? (
              <>
                <div>• 6 個 1星 ⭐</div>
                <div>• 3 個 2星 ⭐⭐</div>
                <div>• 1 個 3星 ⭐⭐⭐</div>
              </>
            ) : qty === '5' ? (
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
      );
    }

    if (revealType === 'altar') {
      return (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded">
          <p className="text-xs text-red-400">
            ⚠️ 注意：過期未揭示的升級將失敗，所有材料已被燃燒。
            請確保在時限內揭示升級結果。
          </p>
        </div>
      );
    }

    if (revealType === 'dungeon') {
      return (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded">
          <p className="text-xs text-red-400">
            ⚠️ 注意：過期的探險需要強制揭示。
          </p>
        </div>
      );
    }

    return null;
  };

  // 內容渲染函數
  const renderRevealContent = () => {
    // 如果沒有待揭示的承諾，顯示手動操作按鈕
    if (!hasPendingCommitment) {
      return (
        <div className={`bg-gray-800 rounded-lg p-4 border-2 border-dashed border-gray-600 max-w-md mx-auto ${!collapsible ? className : ''}`}>
          <div className="text-center space-y-3">
            <h3 className="text-sm font-semibold text-gray-400">
              {!collapsible ? getTitle() : ''}
            </h3>
            <p className="text-xs text-gray-500">
              {revealType === 'mint' 
                ? '當前沒有檢測到待揭示的鑄造'
                : revealType === 'altar' 
                  ? '當前沒有檢測到待揭示的升級'
                  : '當前沒有檢測到待揭示的探險'
              }
            </p>
            
            {/* 手動操作按鈕 */}
            <div className="space-y-2">
              <ActionButton
                onClick={handleManualReveal}
                disabled={isLoading || !data}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm py-2"
              >
                🎯 手動揭示
              </ActionButton>
              
              <ActionButton
                onClick={handleForceReveal}
                disabled={isLoading || !data}
                className="w-full bg-red-600 hover:bg-red-700 text-sm py-2"
              >
                ⚠️ 強制揭示（過期）
              </ActionButton>
              
              <p className="text-xs text-gray-500 mt-2">
                💡 如果您確定有未揭示的 NFT 但系統未檢測到，可以嘗試手動操作
              </p>
            </div>
          </div>
        </div>
      );
    }

    // 移除升星頁面的特殊檢查，因為從數組解析時 burnedTokenIds 總是空的
    // 只要有 commitment 且未完成就顯示

    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${!collapsible ? className : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">
            {!collapsible ? getTitle() : ''}
          </h3>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          {getDetailDisplay()}

          {(blocksUntilReveal || 0) > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">可揭示倒計時</span>
              <span className="text-sm font-medium text-yellow-400">
                {revealCountdown.formatted} ({blocksUntilReveal || 0} 區塊)
              </span>
            </div>
          )}
          
          {(blocksUntilReveal || 0) === 0 && !canReveal && !canForceReveal && (
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
                {expireCountdown.formatted} ({blocksUntilExpire || 0} 區塊)
              </span>
            </div>
          )}

          {mintData && mintData.pendingTokens.length > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Token IDs</span>
              <span className="text-sm font-medium text-white">
                #{mintData.pendingTokens.map(id => id.toString()).join(', #')}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!canForceReveal && (
          <div className="mb-4">
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              {(blocksUntilReveal || 0) > 0 ? (
                <div 
                  className="bg-yellow-500 h-full transition-all duration-300"
                  style={{ width: `${(1 - (blocksUntilReveal || 0) / 4) * 100}%` }}
                />
              ) : (
                <div 
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${(1 - (blocksUntilExpire || 0) / 259) * 100}%` }}
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
              {getActionButtonText()}
            </ActionButton>
          )}

          {canForceReveal && userAddress && (
            <ActionButton
              onClick={() => forceReveal(userAddress)}
              loading={isLoading}
              variant="danger"
              fullWidth
            >
              ⚠️ 強制揭示{revealType === 'mint' ? '（保底稀有度分布）' : revealType === 'dungeon' ? '（探險失敗）' : '（升級失敗）'}
            </ActionButton>
          )}

          {!canReveal && !canForceReveal && (blocksUntilReveal || 0) > 0 && (
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">
                揭示需要等待 {blocksUntilReveal || 0} 個區塊
              </p>
              <p className="text-xs text-gray-500">
                BSC 約每 {BSC_BLOCK_TIME} 秒產生一個新區塊
              </p>
            </div>
          )}
          
          {!canReveal && !canForceReveal && (blocksUntilReveal || 0) === 0 && (
            <ActionButton
              onClick={() => {
                refetch();
                window.location.reload();
              }}
              variant="secondary"
              fullWidth
            >
              🔄 刷新狀態
            </ActionButton>
          )}
        </div>

        {/* Force reveal warning */}
        {canForceReveal && getForceRevealWarning()}
      </div>
    );
  };

  // 摺疊模式的標題欄
  if (collapsible) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div 
          className="flex items-center justify-between cursor-pointer p-3 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h2 className="text-lg font-bold text-white">
            {getTitle()}
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">
              {isExpanded ? '點擊收起' : '點擊展開'}
            </span>
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="animate-fadeIn">
            {renderRevealContent()}
          </div>
        )}
      </div>
    );
  }

  // 非摺疊模式，直接渲染內容
  return renderRevealContent();
};