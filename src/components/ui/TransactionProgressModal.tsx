// src/components/ui/TransactionProgressModal.tsx - 交易進度彈窗

import React from 'react';
import { Modal } from './Modal';
import { TransactionProgress } from './TransactionProgress';
import type { TransactionProgressState } from '../../hooks/useTransactionWithProgress';

interface TransactionProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: TransactionProgressState;
  title?: string;
}

export const TransactionProgressModal: React.FC<TransactionProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
  title = '交易進度',
}) => {
  // 交易成功或失敗後可以關閉
  const canClose = progress?.status === 'success' || progress?.status === 'error' || progress?.status === 'idle';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      showCloseButton={canClose}
      closeOnOverlayClick={canClose}
      closeOnEsc={canClose}
    >
      {progress?.hash ? (
        <TransactionProgress
          hash={progress?.hash || ''}
          onSuccess={() => {
            // 延遲關閉，讓用戶看到成功狀態
            setTimeout(onClose, 2000);
          }}
          onError={() => {
            // 錯誤時不自動關閉，讓用戶查看詳情
          }}
        />
      ) : (
        <div className="text-center py-8">
          <div className="mb-4">
            {progress?.status === 'signing' ? (
              <>
                <div className="animate-pulse text-4xl mb-4">✍️</div>
                <p className="text-lg font-medium">請在錢包中簽名...</p>
                <p className="text-sm text-gray-400 mt-2">
                  請確認 MetaMask 或其他錢包的彈窗
                </p>
              </>
            ) : progress?.status === 'error' ? (
              <>
                <div className="text-4xl mb-4">❌</div>
                <p className="text-lg font-medium text-red-400">交易失敗</p>
                <p className="text-sm text-gray-400 mt-2">
                  {progress?.error?.message || '未知錯誤'}
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">💤</div>
                <p className="text-lg font-medium text-gray-400">等待交易...</p>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};