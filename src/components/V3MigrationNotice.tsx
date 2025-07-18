// V3 合約遷移通知組件
import React, { useState } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { getContract } from '../config/contracts';
import { bsc } from 'wagmi/chains';
import { ActionButton } from './ui/ActionButton';
import { Modal } from './ui/Modal';
import { useAppToast } from '../contexts/SimpleToastContext';
import { logger } from '../utils/logger';

interface V3MigrationNoticeProps {
  onClose?: () => void;
}

export const V3MigrationNotice: React.FC<V3MigrationNoticeProps> = ({ onClose }) => {
  const { address, chainId } = useAccount();
  const { showToast } = useAppToast();
  const { writeContract } = useWriteContract();
  const [showModal, setShowModal] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 獲取所有需要的合約
  const heroContract = getContract(bsc.id, 'hero');
  const relicContract = getContract(bsc.id, 'relic');
  const partyContract = getContract(bsc.id, 'party');
  const altarContract = getContract(bsc.id, 'altarOfAscension');
  const soulShardContract = getContract(bsc.id, 'soulShard');
  const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
  const playerVaultContract = getContract(bsc.id, 'playerVault');

  // 檢查各種授權狀態
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

  const { data: heroToAltar } = useReadContract({
    address: heroContract?.address,
    abi: heroContract?.abi,
    functionName: 'isApprovedForAll',
    args: address && altarContract ? [address, altarContract.address] : undefined,
    query: { enabled: !!address && chainId === bsc.id }
  });

  const { data: relicToAltar } = useReadContract({
    address: relicContract?.address,
    abi: relicContract?.abi,
    functionName: 'isApprovedForAll',
    args: address && altarContract ? [address, altarContract.address] : undefined,
    query: { enabled: !!address && chainId === bsc.id }
  });

  // 需要授權的項目
  const approvalSteps = [
    { 
      name: '英雄 NFT → 組隊合約', 
      approved: heroToParty,
      contract: heroContract,
      spender: partyContract?.address,
      type: 'nft' as const
    },
    { 
      name: '聖物 NFT → 組隊合約', 
      approved: relicToParty,
      contract: relicContract,
      spender: partyContract?.address,
      type: 'nft' as const
    },
    { 
      name: '英雄 NFT → 祭壇合約', 
      approved: heroToAltar,
      contract: heroContract,
      spender: altarContract?.address,
      type: 'nft' as const
    },
    { 
      name: '聖物 NFT → 祭壇合約', 
      approved: relicToAltar,
      contract: relicContract,
      spender: altarContract?.address,
      type: 'nft' as const
    }
  ];

  const pendingApprovals = approvalSteps.filter(step => !step.approved);

  const handleClose = () => {
    if (!isProcessing) {
      setShowModal(false);
      onClose?.();
    }
  };

  const handleBatchApproval = async () => {
    if (pendingApprovals.length === 0) {
      setShowModal(false);
      return;
    }

    setIsProcessing(true);
    
    try {
      for (let i = 0; i < pendingApprovals.length; i++) {
        const approval = pendingApprovals[i];
        setCurrentStep(i + 1);
        
        showToast(`正在授權 ${approval.name}...`, 'info');
        
        await writeContract({
          address: approval.contract?.address as `0x${string}`,
          abi: approval.contract?.abi,
          functionName: 'setApprovalForAll',
          args: [approval.spender, true],
        });
        
        // 等待一下讓交易確認
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      showToast('所有授權已完成！', 'success');
      // 記錄授權已完成
      if (address) {
        localStorage.setItem(`v3-auth-completed-${address}`, 'true');
      }
      setShowModal(false);
      onClose?.();
    } catch (error) {
      logger.error('批量授權失敗:', error);
      showToast('授權過程中出現錯誤，請重試', 'error');
    } finally {
      setIsProcessing(false);
      setCurrentStep(0);
    }
  };

  // 如果沒有地址或不是正確的鏈，就不顯示
  if (!address || chainId !== bsc.id) {
    return null;
  }

  return (
    <Modal
      isOpen={showModal}
      onClose={handleClose}
      title="🚀 V3 合約升級通知"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">重要更新</h3>
          <p className="text-sm text-gray-300">
            我們已經升級到 V3 版本合約，修復了多個關鍵問題。由於合約地址變更，您需要重新授權才能使用以下功能：
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white">需要授權的項目：</h4>
          {pendingApprovals.map((approval, index) => (
            <div 
              key={approval.name} 
              className={`flex items-center justify-between p-3 rounded-lg ${
                currentStep > index ? 'bg-green-900/20 border border-green-500/30' : 
                currentStep === index + 1 ? 'bg-yellow-900/20 border border-yellow-500/30' : 
                'bg-gray-800/50'
              }`}
            >
              <span className="text-sm">{approval.name}</span>
              <span className="text-xs">
                {currentStep > index ? '✅ 已完成' : 
                 currentStep === index + 1 ? '⏳ 處理中...' : 
                 '⏸️ 等待中'}
              </span>
            </div>
          ))}
        </div>

        {isProcessing && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-sm text-yellow-300">
              正在處理第 {currentStep}/{pendingApprovals.length} 個授權...
            </p>
            <p className="text-xs text-gray-400 mt-1">
              請在錢包中確認交易，不要關閉此窗口
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <ActionButton
            onClick={handleBatchApproval}
            isLoading={isProcessing}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? `處理中 (${currentStep}/${pendingApprovals.length})` : '一鍵完成所有授權'}
          </ActionButton>
          {!isProcessing && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              稍後處理
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};