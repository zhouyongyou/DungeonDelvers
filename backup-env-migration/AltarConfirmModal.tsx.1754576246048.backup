// src/components/altar/AltarConfirmModal.tsx
// 升星確認對話框增強版 - 支持授權檢查和樂觀更新

import React, { useState, useCallback } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { Modal } from '../ui/Modal';
import { ActionButton } from '../ui/ActionButton';
import { getContractWithABI } from '../../config/contractsWithABI';
import { AltarNftAuthManager } from './AltarNftAuthManager';
import type { NftType } from '../../types/nft';

interface AltarRule {
  targetRarity: number;
  materialsRequired: number;
  baseCost: bigint;
  greatSuccessRate: number;
  successRate: number;
  partialFailRate: number;
  totalFailRate: number;
  enabled: boolean;
}

interface AltarConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  nftType: NftType;
  selectedCount: number;
  rule: AltarRule | null;
  isLoading?: boolean;
}

export const AltarConfirmModal: React.FC<AltarConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  nftType,
  selectedCount,
  rule,
  isLoading = false
}) => {
  const { address } = useAccount();
  const [authRefreshKey, setAuthRefreshKey] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [optimisticSuccess, setOptimisticSuccess] = useState(false);

  // 獲取合約信息
  const heroContract = getContractWithABI('HERO');
  const relicContract = getContractWithABI('RELIC');
  const altarContract = getContractWithABI('ALTAROFASCENSION');

  // 檢查授權狀態
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
      enabled: !!address && !!altarContract && isOpen,
      refetchInterval: 3000, // 每3秒刷新授權狀態
    }
  });

  const [heroAuthResult, relicAuthResult] = authResults || [];
  const isHeroAuthorized = heroAuthResult?.result as boolean ?? false;
  const isRelicAuthorized = relicAuthResult?.result as boolean ?? false;
  
  // 檢查當前NFT類型是否已授權
  const isCurrentTypeAuthorized = nftType === 'hero' ? isHeroAuthorized : isRelicAuthorized;
  const canProceed = isCurrentTypeAuthorized && rule && selectedCount === rule.materialsRequired;

  // 授權狀態改變回調 - 加入樂觀更新
  const handleAuthStatusChange = useCallback(() => {
    setAuthRefreshKey(prev => prev + 1);
    // 觸發重新檢查授權狀態
    setTimeout(() => {
      refetchAuth();
    }, 1000);
  }, [refetchAuth]);

  // 處理升星確認 - 加入樂觀更新
  const handleConfirmWithOptimism = useCallback(async () => {
    if (!canProceed) return;
    
    try {
      setIsExecuting(true);
      await onConfirm();
      
      // 樂觀更新：假設升星成功
      setOptimisticSuccess(true);
      
      // 3秒後關閉模態框，讓用戶看到結果
      setTimeout(() => {
        setOptimisticSuccess(false);
        setIsExecuting(false);
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('升星失敗:', error);
      setIsExecuting(false);
      setOptimisticSuccess(false);
    }
  }, [canProceed, onConfirm, onClose]);

  if (!rule) return null;

  const targetRarity = rule.targetRarity;
  const successRate = rule.greatSuccessRate + rule.successRate;

  // 按鈕狀態邏輯
  const getButtonState = () => {
    if (optimisticSuccess) return { text: "🎉 儀式完成！", disabled: true, loading: false };
    if (isExecuting || isLoading) return { text: "⚡ 進行儀式中...", disabled: true, loading: true };
    if (!canProceed) return { text: "請先完成授權", disabled: true, loading: false };
    return { text: "🚀 開始神秘儀式", disabled: false, loading: false };
  };

  const buttonState = getButtonState();

  return (
    <Modal
      isOpen={isOpen}
      onClose={!isExecuting ? onClose : undefined}
      title={optimisticSuccess ? "🎊 儀式結果" : "🔮 確認神秘儀式"}
      onConfirm={canProceed && !isExecuting ? handleConfirmWithOptimism : undefined}
      confirmText={buttonState.text}
      cancelText={isExecuting ? undefined : "取消"}
      confirmButtonClass={
        optimisticSuccess 
          ? "bg-gradient-to-r from-green-600 to-emerald-600"
          : canProceed && !isExecuting
          ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
          : "bg-gray-600 cursor-not-allowed"
      }
      loading={buttonState.loading}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* 樂觀成功狀態 */}
        {optimisticSuccess && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-6 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-green-300 mb-2">升星儀式已啟動！</h3>
            <p className="text-green-200 mb-4">您的 NFT 正在進行神秘的蛻變...</p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-300">
              <div className="animate-spin w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full"></div>
              <span>請稍候片刻查看結果，或手動刷新頁面</span>
            </div>
          </div>
        )}

        {/* 進行中狀態 */}
        {isExecuting && !optimisticSuccess && (
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-bold text-purple-300 mb-2">正在執行神秘儀式...</h3>
            <p className="text-purple-200 mb-4">請等待區塊鏈確認您的交易</p>
            <div className="flex items-center justify-center gap-2 text-sm text-purple-300">
              <div className="animate-pulse w-2 h-2 bg-purple-400 rounded-full"></div>
              <div className="animate-pulse w-2 h-2 bg-purple-400 rounded-full" style={{ animationDelay: '0.2s' }}></div>
              <div className="animate-pulse w-2 h-2 bg-purple-400 rounded-full" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}

        {/* 升級信息 - 只在非執行狀態顯示 */}
        {!optimisticSuccess && (
          <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-lg p-4">
            <h4 className="font-semibold text-purple-300 mb-3">⚡ 升級 {targetRarity - 1}★ {nftType === 'hero' ? '英雄' : '聖物'}</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">目標星級：</span>
                <span className="text-yellow-400 font-bold">{targetRarity}★</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">所需祭品：</span>
                <span className="text-white font-medium">{selectedCount}/{rule.materialsRequired}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">升級費用：</span>
                <span className="text-green-400 font-medium">
                  {(Number(rule.baseCost) / 1e18).toFixed(2)} $SS
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">成功率：</span>
                <span className="text-green-400 font-bold">{successRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 神諭預言 */}
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-300 mb-3">神諭預言</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-purple-300">⚜️ 神跡降臨</span>
              <span className="text-purple-400 font-bold">{rule.greatSuccessRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-300">✨ 祝福成功</span>
              <span className="text-green-400 font-bold">{rule.successRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-300">⚡ 部分返還</span>
              <span className="text-yellow-400 font-bold">{rule.partialFailRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-300">💀 升星失敗</span>
              <span className="text-red-400 font-bold">{rule.totalFailRate}%</span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">✨ 總成功率：</span>
              <span className="text-xl font-bold text-green-400">
                {successRate}% {successRate >= 70 ? '(新手友好)' : successRate >= 50 ? '(穩定成功)' : '(高風險)'}
              </span>
            </div>
          </div>
        </div>

        {/* 授權檢查和管理 - 只在非執行狀態顯示 */}
        {!isCurrentTypeAuthorized && !isExecuting && !optimisticSuccess && (
          <div className="space-y-4">
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-300">
                <span>⚠️</span>
                <span className="font-medium">需要授權才能進行升星儀式</span>
              </div>
            </div>
            
            <AltarNftAuthManager 
              onAuthStatusChange={handleAuthStatusChange}
              key={authRefreshKey}
            />
          </div>
        )}

        {/* 風險提示 - 只在正常狀態顯示 */}
        {!isExecuting && !optimisticSuccess && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <div className="text-center space-y-2">
              <div className="text-red-300 font-medium">⚠️ 重要提醒</div>
              <div className="text-sm text-red-200">
                升星儀式具有風險性，失敗時祭品NFT可能會被消耗
              </div>
              <div className="text-xs text-gray-400 italic">
                "一旦儀式開始，就無法回頭..."
              </div>
            </div>
          </div>
        )}

        {/* 選中NFT狀態提示 - 只在正常狀態顯示 */}
        {selectedCount !== rule.materialsRequired && !isExecuting && !optimisticSuccess && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-center">
            <div className="text-blue-300 text-sm">
              還需要選擇 {rule.materialsRequired - selectedCount} 個祭品才能開始儀式
            </div>
          </div>
        )}

        {/* 刷新提示 - 只在樂觀成功狀態顯示 */}
        {optimisticSuccess && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-center">
            <div className="text-blue-300 text-sm mb-2">
              💡 提示：如果頁面沒有自動更新結果
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
            >
              🔄 手動刷新頁面
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AltarConfirmModal;