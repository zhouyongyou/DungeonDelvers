import React, { useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useTransactionStore } from '../../stores/useTransactionStore';
import type { Hash } from 'viem';

/**
 * 這是一個內部元件，專門負責追蹤單一一筆交易的狀態。
 * 它本身不會渲染任何畫面 (return null)。
 */
const TrackedTransaction: React.FC<{ hash: Hash }> = ({ hash }) => {
  // 從我們的 store 中取得更新交易狀態的函式
  const updateTransactionStatus = useTransactionStore((state) => state.updateTransactionStatus);

  // 【修正】從 hook 中獲取 isSuccess 和 isError 狀態，而不是傳入 callback
  const { isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  // 【修正】使用 useEffect 來監聽狀態變化
  useEffect(() => {
    if (isSuccess) {
      updateTransactionStatus(hash, 'success');
    }
    if (isError) {
      updateTransactionStatus(hash, 'error');
    }
  }, [isSuccess, isError, hash, updateTransactionStatus]);


  return null; // 這個元件是純邏輯，不渲染任何 UI
};

/**
 * 這是主要的監聽器元件。
 * 它會從 store 中找出所有狀態為 'pending' 的交易，
 * 然後為每一筆交易都渲染一個 TrackedTransaction 元件來追蹤它。
 */
export const TransactionWatcher: React.FC = () => {
  // 從 store 中篩選出所有正在處理中的交易
  const pendingTransactions = useTransactionStore((state) =>
    state.transactions.filter((tx) => tx.status === 'pending')
  );

  return (
    <>
      {pendingTransactions.map((tx) => (
        <TrackedTransaction key={tx.hash} hash={tx.hash} />
      ))}
    </>
  );
};
