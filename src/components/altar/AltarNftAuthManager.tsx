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

  // 一鍵授權兩種NFT
  const handleBatchAuth = useCallback(async () => {
    if (!address || !altarContract || !heroContract || !relicContract) return;

    try {
      updateOptimisticAuth('both', true);
      showToast('正在批量授權英雄和聖物合約...', 'info');

      // 依序執行兩個授權交易
      if (!isHeroAuthorized) {
        await writeContract({
          address: heroContract.address as `0x${string}`,
          abi: heroContract.abi,
          functionName: 'setApprovalForAll',
          args: [altarContract.address, true],
        });
        
        // 等待第一個交易確認
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (!isRelicAuthorized) {
        await writeContract({
          address: relicContract.address as `0x${string}`,
          abi: relicContract.abi,
          functionName: 'setApprovalForAll',
          args: [altarContract.address, true],
        });
      }

      showToast('✅ 批量授權交易已發送！', 'success');
      
      // 等待確認後刷新狀態
      setTimeout(() => {
        refetchAuth();
        onAuthStatusChange?.();
      }, 5000);

    } catch (error) {
      logger.error('批量授權失敗:', error);
      showToast('批量授權失敗，請重試', 'error');
    } finally {
      updateOptimisticAuth('both', false);
    }
  }, [
    address, altarContract, heroContract, relicContract,
    isHeroAuthorized, isRelicAuthorized,
    writeContract, showToast, refetchAuth, onAuthStatusChange, updateOptimisticAuth
  ]);

  if (!address || allAuthorized) {
    return null; // 已全部授權則不顯示
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
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
          <span className="text-gray-300">🦸 英雄 NFT</span>
          <span className={`font-medium ${isHeroAuthorized ? 'text-green-400' : 'text-red-400'}`}>
            {isHeroAuthorized ? '✅ 已授權' : '❌ 未授權'}
          </span>
        </div>
        <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
          <span className="text-gray-300">🏺 聖物 NFT</span>
          <span className={`font-medium ${isRelicAuthorized ? 'text-green-400' : 'text-red-400'}`}>
            {isRelicAuthorized ? '✅ 已授權' : '❌ 未授權'}
          </span>
        </div>
      </div>

      {/* 授權按鈕 */}
      <div className="space-y-3">
        {/* 一鍵授權按鈕 - 當兩個都未授權時顯示 */}
        {!isHeroAuthorized && !isRelicAuthorized && (
          <ActionButton
            onClick={handleBatchAuth}
            isLoading={authStates.isAuthingBoth}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
          >
            🚀 一鍵授權兩種 NFT
          </ActionButton>
        )}
        
        {/* 單獨授權按鈕 */}
        <div className="grid grid-cols-2 gap-3">
          {!isHeroAuthorized && (
            <ActionButton
              onClick={() => handleSingleAuth('hero')}
              isLoading={authStates.isAuthingHero}
              disabled={authStates.isAuthingBoth}
              className="h-10 bg-gradient-to-r from-blue-600 to-blue-500"
            >
              🔓 授權英雄
            </ActionButton>
          )}
          
          {!isRelicAuthorized && (
            <ActionButton
              onClick={() => handleSingleAuth('relic')}
              isLoading={authStates.isAuthingRelic}
              disabled={authStates.isAuthingBoth}
              className="h-10 bg-gradient-to-r from-green-600 to-green-500"
            >
              🔓 授權聖物
            </ActionButton>
          )}
        </div>
      </div>

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