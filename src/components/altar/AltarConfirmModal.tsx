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

  // 獲取合約信息
  const heroContract = getContractWithABI('HERO');
  const relicContract = getContractWithABI('RELIC');
  const altarContract = getContractWithABI('ALTAROFASCENSION');

  // 檢查授權狀態
  const { data: authResults } = useReadContracts({
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

  // 授權狀態改變回調
  const handleAuthStatusChange = useCallback(() => {
    setAuthRefreshKey(prev => prev + 1);
  }, []);

  if (!rule) return null;

  const targetRarity = rule.targetRarity;
  const successRate = rule.greatSuccessRate + rule.successRate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔮 確認神秘儀式"
      onConfirm={canProceed ? onConfirm : undefined}
      confirmText={canProceed ? "開始儀式" : "請先完成授權"}
      cancelText="取消"
      confirmButtonClass={canProceed 
        ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
        : "bg-gray-600 cursor-not-allowed"
      }
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* 升級信息 */}
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

        {/* 授權檢查和管理 */}
        {!isCurrentTypeAuthorized && (
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

        {/* 風險提示 */}
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

        {/* 選中NFT狀態提示 */}
        {selectedCount !== rule.materialsRequired && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-center">
            <div className="text-blue-300 text-sm">
              還需要選擇 {rule.materialsRequired - selectedCount} 個祭品才能開始儀式
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AltarConfirmModal;