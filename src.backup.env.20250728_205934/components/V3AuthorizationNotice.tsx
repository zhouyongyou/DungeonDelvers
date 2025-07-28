// 合約授權通知 - V1版本（無祭壇）
import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { getContract } from '../config/contracts';
import { bsc } from 'wagmi/chains';
import { ActionButton } from './ui/ActionButton';
import { useAppToast } from '../contexts/SimpleToastContext';
import { logger } from '../utils/logger';

export const V3AuthorizationNotice: React.FC = () => {
  const { address, chainId } = useAccount();
  const { showToast } = useAppToast();
  const { writeContract } = useWriteContract();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasUserDismissed, setHasUserDismissed] = useState(false);

  // 獲取合約
  const heroContract = getContract('HERO');
  const relicContract = getContract('RELIC');
  const partyContract = getContract('PARTY');
  // V1版本：暫時不包含祭壇授權

  // 檢查授權狀態
  const { data: heroToParty } = useReadContract({
    address: heroContract?.address,
    abi: heroContract?.abi,
    functionName: 'isApprovedForAll',
    args: address && partyContract ? [address, partyContract.address] : undefined,
    query: { enabled: !!address && chainId === bsc.id }
  });

  const { data: relicToParty } = useReadContract({
    address: relicContract?.address,
    abi: relicContract?.abi,
    functionName: 'isApprovedForAll',
    args: address && partyContract ? [address, partyContract.address] : undefined,
    query: { enabled: !!address && chainId === bsc.id }
  });

  // 檢查本地存儲
  useEffect(() => {
    if (address) {
      const dismissed = localStorage.getItem(`v1-notice-dismissed-${address}`);
      setHasUserDismissed(dismissed === 'true');
    }
  }, [address]);

  // 計算需要授權的數量
  const needsAuth = [
    !heroToParty,
    !relicToParty
  ].filter(Boolean).length;

  // 如果不需要顯示，返回 null
  if (!address || chainId !== bsc.id || needsAuth === 0 || hasUserDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(`v1-notice-dismissed-${address}`, 'true');
    setHasUserDismissed(true);
  };

  const handleAuthorize = async () => {
    setIsProcessing(true);
    
    try {
      // 授權英雄給組隊
      if (!heroToParty) {
        showToast('授權英雄 NFT 給組隊合約...', 'info');
        await writeContract({
          address: heroContract?.address as `0x${string}`,
          abi: heroContract?.abi,
          functionName: 'setApprovalForAll',
          args: [partyContract?.address, true],
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 授權聖物給組隊
      if (!relicToParty) {
        showToast('授權聖物 NFT 給組隊合約...', 'info');
        await writeContract({
          address: relicContract?.address as `0x${string}`,
          abi: relicContract?.abi,
          functionName: 'setApprovalForAll',
          args: [partyContract?.address, true],
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      showToast('所有授權已完成！', 'success');
      handleDismiss();
    } catch (error) {
      logger.error('授權失敗:', error);
      showToast('授權過程中出現錯誤', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <div className={`bg-gray-800 border border-yellow-500/50 rounded-lg shadow-lg transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-auto'
      }`}>
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 px-4 py-3 text-yellow-300 hover:text-yellow-200 transition-colors"
          >
            <span className="text-lg animate-pulse">⚠️</span>
            <span className="text-sm font-medium">需要合約授權 ({needsAuth})</span>
          </button>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="text-yellow-300 font-semibold">合約授權通知</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-gray-300">
              檢測到您有 {needsAuth} 個授權需要更新，授權後才能組隊遊玩。
            </p>

            <div className="flex gap-2">
              <ActionButton
                onClick={handleAuthorize}
                isLoading={isProcessing}
                disabled={isProcessing}
                className="flex-1 py-2 text-sm"
              >
                立即授權
              </ActionButton>
              <button
                onClick={handleDismiss}
                disabled={isProcessing}
                className="px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
              >
                稍後
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};