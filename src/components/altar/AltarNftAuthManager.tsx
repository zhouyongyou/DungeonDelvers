// src/components/altar/AltarNftAuthManager.tsx
// NFT 授權統一管理組件

import React, { useState, useCallback, useMemo } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getContractWithABI } from '../../config/contractsWithABI';
import { ActionButton } from '../ui/ActionButton';
import { useAppToast } from '../../contexts/SimpleToastContext';
import { logger } from '../../utils/logger';
import type { AnyNft, HeroNft } from '../../types/nft';

interface AltarNftAuthManagerProps {
  selectedSacrifices?: HeroNft[];
  selectedRelics?: AnyNft[];
  onAuthStatusChange?: () => void;
  onAuthComplete?: () => void;
  className?: string;
  renderTrigger?: (props: {
    isLoading: boolean;
    needsAuth: boolean;
    handleAuth: () => void;
    authStatus: Array<{
      name: string;
      approved: boolean;
      pending: boolean;
      needed: boolean;
    }>;
  }) => React.ReactNode;
}

export const AltarNftAuthManager: React.FC<AltarNftAuthManagerProps> = ({
  selectedSacrifices = [],
  selectedRelics = [],
  onAuthStatusChange,
  onAuthComplete,
  className = '',
  renderTrigger
}) => {
  const { address } = useAccount();
  const { showToast } = useAppToast();
  const [optimisticAuth, setOptimisticAuth] = useState<{
    hero: boolean;
    relic: boolean;
  }>({ hero: false, relic: false });

  // 獲取合約信息
  const heroContract = getContractWithABI('Hero');
  const relicContract = getContractWithABI('Relic');
  const altarContract = getContractWithABI('Altar');

  // 批量讀取授權狀態
  const { data: authResults, refetch: refetchAuth } = useReadContracts({
    contracts: [
      {
        ...heroContract,
        functionName: 'isApprovedForAll',
        args: address && altarContract ? [address, altarContract.address] : undefined,
      },
      {
        ...relicContract,
        functionName: 'isApprovedForAll',
        args: address && altarContract ? [address, altarContract.address] : undefined,
      }
    ],
    query: {
      enabled: !!address && !!altarContract,
      staleTime: 10000, // 10秒緩存
    }
  });

  const [heroAuthResult, relicAuthResult] = authResults || [];
  const isHeroAuthorized = heroAuthResult?.result as boolean ?? false;
  const isRelicAuthorized = relicAuthResult?.result as boolean ?? false;
  
  // 考慮樂觀更新
  const effectiveHeroApproved = optimisticAuth.hero || isHeroAuthorized;
  const effectiveRelicApproved = optimisticAuth.relic || isRelicAuthorized;
  
  // 判斷是否需要授權
  const needsHeroAuth = selectedSacrifices.length > 0 && !effectiveHeroApproved;
  const needsRelicAuth = selectedRelics.length > 0 && !effectiveRelicApproved;
  const needsAnyAuth = needsHeroAuth || needsRelicAuth;
  const allAuthorized = effectiveHeroApproved && effectiveRelicApproved;

  // Write contracts
  const { writeContract: approveHero, data: heroTxHash } = useWriteContract();
  const { writeContract: approveRelic, data: relicTxHash } = useWriteContract();
  
  // Wait for transactions
  const { isLoading: isHeroTxPending } = useWaitForTransactionReceipt({
    hash: heroTxHash,
    onReplaced: () => {
      showToast('英雄NFT授權交易被替換', 'warning');
      setOptimisticAuth(prev => ({ ...prev, hero: false }));
    },
    onError: () => {
      showToast('英雄NFT授權失敗', 'error');
      setOptimisticAuth(prev => ({ ...prev, hero: false }));
    },
    onSuccess: () => {
      showToast('英雄NFT授權成功！', 'success');
      refetchAuth();
      onAuthStatusChange?.();
    }
  });
  
  const { isLoading: isRelicTxPending } = useWaitForTransactionReceipt({
    hash: relicTxHash,
    onReplaced: () => {
      showToast('聖物NFT授權交易被替換', 'warning');
      setOptimisticAuth(prev => ({ ...prev, relic: false }));
    },
    onError: () => {
      showToast('聖物NFT授權失敗', 'error');
      setOptimisticAuth(prev => ({ ...prev, relic: false }));
    },
    onSuccess: () => {
      showToast('聖物NFT授權成功！', 'success');
      refetchAuth();
      onAuthStatusChange?.();
    }
  });
  
  const isProcessing = isHeroTxPending || isRelicTxPending;

  // 統一授權處理
  const handleAuth = useCallback(async () => {
    if (!address || !altarContract) {
      showToast('請先連接錢包', 'error');
      return;
    }

    try {
      if (needsHeroAuth) {
        logger.info('Approving Hero NFTs for Altar');
        setOptimisticAuth(prev => ({ ...prev, hero: true }));
        
        approveHero({
          address: heroContract.address as `0x${string}`,
          abi: heroContract.abi,
          functionName: 'setApprovalForAll',
          args: [altarContract.address, true],
        });
      }

      if (needsRelicAuth) {
        logger.info('Approving Relic NFTs for Altar');
        setOptimisticAuth(prev => ({ ...prev, relic: true }));
        
        approveRelic({
          address: relicContract.address as `0x${string}`,
          abi: relicContract.abi,
          functionName: 'setApprovalForAll',
          args: [altarContract.address, true],
        });
      }

      onAuthComplete?.();
    } catch (error) {
      logger.error('Failed to approve NFTs:', error);
      showToast('授權失敗，請重試', 'error');
      setOptimisticAuth({ hero: false, relic: false });
    }
  }, [address, needsHeroAuth, needsRelicAuth, approveHero, approveRelic, heroContract, relicContract, altarContract, onAuthComplete, showToast]);

  // 授權狀態顯示
  const authStatus = useMemo(() => {
    const items = [];
    
    if (selectedSacrifices.length > 0) {
      items.push({
        name: '英雄 NFT',
        approved: effectiveHeroApproved,
        pending: isHeroTxPending,
        needed: true
      });
    }
    
    if (selectedRelics.length > 0) {
      items.push({
        name: '聖物 NFT',
        approved: effectiveRelicApproved,
        pending: isRelicTxPending,
        needed: true
      });
    }

    return items;
  }, [selectedSacrifices.length, selectedRelics.length, effectiveHeroApproved, effectiveRelicApproved, isHeroTxPending, isRelicTxPending]);

  // 自定義渲染觸發器
  if (renderTrigger) {
    return (
      <>
        {renderTrigger({
          isLoading: isProcessing,
          needsAuth: needsAnyAuth,
          handleAuth,
          authStatus
        })}
      </>
    );
  }
  
  // 如果不需要授權則不顯示預設UI
  if (!address || !needsAnyAuth) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-xl p-4 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">⚠️</div>
        <div>
          <h4 className="font-semibold text-yellow-300">NFT 授權管理</h4>
          <p className="text-sm text-yellow-200">授權祭壇合約操作您的 NFT</p>
        </div>
      </div>

      {/* 授權狀態顯示 */}
      <div className="space-y-2">
        {authStatus.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg text-sm">
            <span className="text-gray-300">{item.name}</span>
            <span className={`flex items-center gap-1 font-medium ${
              item.approved ? 'text-green-400' : 
              item.pending ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {item.approved ? '✅ 已授權' : 
               item.pending ? '⏳ 處理中...' : '❌ 未授權'}
            </span>
          </div>
        ))}
      </div>

      {/* 授權按鈕 */}
      {needsAnyAuth && (
        <div className="space-y-3">
          <ActionButton
            onClick={handleAuth}
            disabled={isProcessing}
            loading={isProcessing}
            size="md"
            className={`w-full transition-all duration-300 ${
              isProcessing 
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 transform scale-95'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:scale-105'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>🔄 授權處理中...</span>
              </div>
            ) : (
              authStatus.length === 2 ? '🚀 一鍵授權所有NFT' : '🔓 授權NFT'
            )}
          </ActionButton>
          
          {/* 處理中的動畫提示 */}
          {isProcessing && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <div className="text-sm text-yellow-300">
                  正在處理授權交易，請在錢包中確認...
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {!needsAnyAuth && authStatus.length > 0 && (
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2 text-green-300">
            <div className="text-xl animate-pulse">✅</div>
            <span className="font-medium">所有必要的授權已完成</span>
          </div>
          <div className="text-center text-xs text-green-400 mt-1">
            🎉 現在可以進行升星儀式了！
          </div>
        </div>
      )}

      {/* 提示信息 */}
      <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-200 text-center">
          💡 授權後祭壇合約才能操作您的 NFT 進行升星儀式
        </p>
      </div>
    </div>
  );
};

export default AltarNftAuthManager;