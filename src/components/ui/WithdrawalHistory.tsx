// src/components/ui/WithdrawalHistory.tsx
// 提取歷史組件 - 顯示用戶的金庫提取記錄（基於本地存儲）

import React, { useState, useEffect } from 'react';
import { Icons } from './icons';
import { ActionButton } from './ActionButton';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';
import { formatSoul } from '../../utils/formatters';
import { useTransactionPersistence } from '../../stores/useTransactionPersistence';
import { formatEther } from 'viem';

interface WithdrawalRecord {
  id: string;
  amount: string;
  timestamp: number;
  txHash: string;
  status: 'pending' | 'success' | 'failed';
}

interface WithdrawalHistoryProps {
  userAddress: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawalHistory: React.FC<WithdrawalHistoryProps> = ({
  userAddress,
  isOpen,
  onClose
}) => {
  const [page, setPage] = useState(0);
  const [withdrawalRecords, setWithdrawalRecords] = useState<WithdrawalRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageSize = 10;

  // 從交易持久化系統獲取提取記錄
  const { getTransactionsByType } = useTransactionPersistence();

  useEffect(() => {
    if (isOpen && userAddress) {
      // 立即獲取一次數據
      const fetchRecords = () => {
        // 獲取所有 'claim' 類型的交易（金庫提取）
        const claimTransactions = getTransactionsByType('claim', userAddress);
        
        // 轉換為提取記錄格式
        const records: WithdrawalRecord[] = claimTransactions
          .filter(tx => tx.description.includes('金庫') || tx.description.includes('獎勵'))
          .map(tx => ({
            id: tx.id,
            amount: tx.relatedData?.amount || '0',
            timestamp: tx.createdAt,
            txHash: tx.hash || '',
            status: tx.status
          }))
          .sort((a, b) => b.timestamp - a.timestamp);

        setWithdrawalRecords(records);
      };

      fetchRecords();

      // 每5秒刷新一次數據，直到關閉
      const interval = setInterval(() => {
        setIsRefreshing(true);
        fetchRecords();
        setTimeout(() => setIsRefreshing(false), 1000);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isOpen, userAddress, getTransactionsByType]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTxHash = (hash: string) => {
    if (!hash) return '待確認';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const handleViewTransaction = (txHash: string) => {
    if (txHash) {
      window.open(`https://bscscan.com/tx/${txHash}`, '_blank');
    }
  };

  // 分頁邏輯
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = withdrawalRecords.slice(startIndex, endIndex);
  const hasNextPage = endIndex < withdrawalRecords.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>📋 提取歷史</span>
          {isRefreshing && (
            <span className="text-xs text-gray-400 animate-pulse">刷新中...</span>
          )}
        </div>
      }
      onConfirm={onClose}
      confirmText="關閉"
      maxWidth="4xl"
      showCloseButton={false}
    >
      <div className="space-y-6">
        {/* 更新提示 */}
        <div className="text-xs text-gray-500 text-center bg-gray-800/50 rounded p-2">
          <p>💡 數據每 5 秒自動刷新，區塊鏈數據可能需要 1-2 分鐘才會完全同步</p>
        </div>
          {paginatedRecords.length === 0 ? (
            <EmptyState 
              message="尚無提取記錄" 
              description="您還沒有從金庫提取過任何 SOUL 代幣"
            />
          ) : (
            <>
              {/* History Table */}
              <div className="space-y-3">
                {paginatedRecords.map((record) => {
                  const statusColors = {
                    pending: 'bg-yellow-500',
                    success: 'bg-green-500',
                    failed: 'bg-red-500'
                  };

                  const statusLabels = {
                    pending: '處理中',
                    success: '成功',
                    failed: '失敗'
                  };

                  return (
                    <div
                      key={record.id}
                      className="bg-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div className={`${statusColors[record.status]} rounded-full p-2`}>
                            <Icons.ArrowDown className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              提取 {record.amount && record.amount !== '0' 
                                ? formatSoul(formatEther(BigInt(record.amount))) 
                                : '待確認'} SOUL
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-gray-400 text-sm">
                                {formatDate(record.timestamp)}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                record.status === 'success' ? 'bg-green-900 text-green-200' :
                                record.status === 'pending' ? 'bg-yellow-900 text-yellow-200' :
                                'bg-red-900 text-red-200'
                              }`}>
                                {statusLabels[record.status]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {record.txHash && (
                          <ActionButton
                            onClick={() => handleViewTransaction(record.txHash)}
                            className="text-xs px-2 py-1"
                            title="在 BSCScan 上查看交易"
                          >
                            <Icons.ExternalLink className="h-3 w-3 mr-1" />
                            {formatTxHash(record.txHash)}
                          </ActionButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {withdrawalRecords.length > pageSize && (
                <div className="flex justify-center gap-2 mt-6">
                  <ActionButton
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-2"
                  >
                    上一頁
                  </ActionButton>
                  <span className="text-gray-400 px-3 py-2">
                    第 {page + 1} 頁 / 共 {Math.ceil(withdrawalRecords.length / pageSize)} 頁
                  </span>
                  <ActionButton
                    onClick={() => setPage(page + 1)}
                    disabled={!hasNextPage}
                    className="px-3 py-2"
                  >
                    下一頁
                  </ActionButton>
                </div>
              )}
            </>
          )}
      </div>
    </Modal>
  );
};

// 提取歷史按鈕組件
interface WithdrawalHistoryButtonProps {
  userAddress?: string;
  className?: string;
}

export const WithdrawalHistoryButton: React.FC<WithdrawalHistoryButtonProps> = ({
  userAddress,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!userAddress) return null;

  return (
    <>
      <ActionButton
        onClick={() => setIsOpen(true)}
        className={`text-xs px-2 py-1 ${className}`}
        title="查看提取歷史（數據更新可能需要 1-2 分鐘）"
      >
        <Icons.History className="h-3 w-3 mr-1" />
        歷史
      </ActionButton>
      
      <WithdrawalHistory
        userAddress={userAddress}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};