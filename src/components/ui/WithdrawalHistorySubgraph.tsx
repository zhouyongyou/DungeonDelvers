// src/components/ui/WithdrawalHistorySubgraph.tsx
// 純子圖版本的提領歷史組件 - 提供更快的更新速度

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icons } from './icons';
import { ActionButton } from './ActionButton';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';
import { formatSoul } from '../../utils/formatters';
import { getApolloClient } from '../../api/graphqlClient';
import { formatEther } from 'viem';

interface WithdrawalEvent {
  id: string;
  player: {
    id: string;
  };
  amount: string;
  timestamp: string;
  txHash: string;
  taxAmount?: string;
  freeWithdraw?: boolean;
}

interface WithdrawalHistorySubgraphProps {
  userAddress: string;
  isOpen: boolean;
  onClose: () => void;
}

// GraphQL 查詢提領事件
const GET_WITHDRAWAL_EVENTS = `
  query GetWithdrawalEvents($player: String!, $first: Int!, $skip: Int!) {
    withdrawalEvents(
      where: { player: $player }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      player {
        id
      }
      amount
      taxAmount
      netAmount
      freeWithdraw
      taxRate
      txHash
      blockNumber
      timestamp
    }
  }
`;

export const WithdrawalHistorySubgraph: React.FC<WithdrawalHistorySubgraphProps> = ({
  userAddress,
  isOpen,
  onClose
}) => {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // 使用 React Query 查詢子圖數據
  const { data: withdrawalEvents = [], isLoading, refetch } = useQuery({
    queryKey: ['withdrawalEvents', userAddress, page],
    queryFn: async () => {
      const apolloClient = getApolloClient();
      const result = await apolloClient.query({
        query: apolloClient.gql`${GET_WITHDRAWAL_EVENTS}`,
        variables: {
          player: userAddress.toLowerCase(),
          first: pageSize,
          skip: page * pageSize
        },
        context: {
          cacheTTL: 1000 * 30 // 30秒緩存
        }
      });

      return result.data.withdrawalEvents || [];
    },
    enabled: isOpen && !!userAddress,
    refetchInterval: 30000, // 每30秒自動刷新
    staleTime: 20000, // 20秒內數據視為新鮮
  });

  const formatDate = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
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

  const hasNextPage = withdrawalEvents.length === pageSize;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>📋 提取歷史</span>
          <span className="text-xs text-gray-400">（子圖版本）</span>
        </div>
      }
      onConfirm={onClose}
      confirmText="關閉"
      maxWidth="4xl"
      showCloseButton={false}
    >
      <div className="space-y-6">
        {/* 子圖版本提示 */}
        <div className="text-xs text-blue-500 text-center bg-blue-900/20 rounded p-2 border border-blue-500/30">
          <p>💎 使用子圖數據，更新速度更快（約30秒）</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : withdrawalEvents.length === 0 ? (
          <EmptyState 
            message="尚無提取記錄" 
            description="您還沒有從金庫提取過任何 SOUL 代幣"
          />
        ) : (
          <>
            {/* History Table */}
            <div className="space-y-3">
              {withdrawalEvents.map((event: WithdrawalEvent) => {
                const totalAmount = BigInt(event.amount);
                const taxAmount = BigInt(event.taxAmount || '0');
                const netAmount = BigInt(event.netAmount || '0');
                const taxRate = event.taxRate || 0;

                return (
                  <div
                    key={event.id}
                    className="bg-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="bg-green-500 rounded-full p-2">
                          <Icons.ArrowDown className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">
                              提取 {formatSoul(formatEther(totalAmount))} SOUL
                            </p>
                            {event.freeWithdraw && (
                              <span className="text-xs px-2 py-1 bg-green-900 text-green-200 rounded-full">
                                免稅
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-400 text-sm">
                              實收: {formatSoul(formatEther(netAmount))} SOUL
                            </p>
                            {taxRate > 0 && (
                              <span className="text-xs text-red-400">
                                (稅率: {taxRate}%)
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs mt-1">
                            {formatDate(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {event.txHash && (
                        <ActionButton
                          onClick={() => handleViewTransaction(event.txHash)}
                          className="text-xs px-2 py-1"
                          title="在 BSCScan 上查看交易"
                        >
                          <Icons.ExternalLink className="h-3 w-3 mr-1" />
                          {formatTxHash(event.txHash)}
                        </ActionButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-6">
              <ActionButton
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-2"
              >
                上一頁
              </ActionButton>
              <span className="text-gray-400 px-3 py-2">
                第 {page + 1} 頁
              </span>
              <ActionButton
                onClick={() => setPage(page + 1)}
                disabled={!hasNextPage}
                className="px-3 py-2"
              >
                下一頁
              </ActionButton>
            </div>

            {/* 刷新按鈕 */}
            <div className="text-center">
              <ActionButton
                onClick={() => refetch()}
                className="text-xs px-3 py-1"
              >
                <Icons.RefreshCw className="h-3 w-3 mr-1" />
                手動刷新
              </ActionButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// 提取歷史按鈕組件（子圖版本）
interface WithdrawalHistorySubgraphButtonProps {
  userAddress?: string;
  className?: string;
}

export const WithdrawalHistorySubgraphButton: React.FC<WithdrawalHistorySubgraphButtonProps> = ({
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
        title="查看提取歷史（子圖版本 - 更快更新）"
      >
        <Icons.History className="h-3 w-3 mr-1" />
        歷史
      </ActionButton>
      
      <WithdrawalHistorySubgraph
        userAddress={userAddress}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};