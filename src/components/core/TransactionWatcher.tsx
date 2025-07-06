// src/components/core/TransactionWatcher.tsx (Bug 修復版)

import React, { useEffect, useMemo } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useTransactionStore, type Transaction } from '../../stores/useTransactionStore';
import type { Hash } from 'viem';

/**
 * 內部元件，負責追蹤單一一筆交易的狀態。
 * 本身不渲染任何畫面。
 */
const TrackedTransaction: React.FC<{ hash: Hash }> = ({ hash }) => {
  const updateTransactionStatus = useTransactionStore((state) => state.updateTransactionStatus);

  const { isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      updateTransactionStatus(hash, 'success');
    }
    if (isError) {
      updateTransactionStatus(hash, 'error');
    }
  }, [isSuccess, isError, hash, updateTransactionStatus]);

  return null;
};


/**
 * 主要的監聽器元件。
 * @dev ★ 核心優化：修復了可能導致無限渲染循環的問題。
 * 我們不再直接在 selector 中進行 filter 操作，而是先選擇完整的陣列，
 * 然後使用 useMemo 來快取過濾後的待處理交易列表。
 * 這可以避免在每次渲染時都創建新陣列，從而打破無限渲染循環。
 */
export const TransactionWatcher: React.FC = () => {
  const allTransactions = useTransactionStore((state) => state.transactions);

  const pendingTransactions = useMemo(
    () => allTransactions.filter((tx: Transaction) => tx.status === 'pending'),
    [allTransactions]
  );

  return (
    <>
      {pendingTransactions.map((tx) => (
        <TrackedTransaction key={tx.hash} hash={tx.hash} />
      ))}
    </>
  );
};