import React, { useEffect, useMemo } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useTransactionStore, type Transaction } from '../../stores/useTransactionStore';
import type { Hash } from 'viem';

/**
 * 內部元件，負責追蹤單一一筆交易的狀態。
 * 本身不渲染任何畫面。
 */
const TrackedTransaction: React.FC<{ hash: Hash }> = ({ hash }) => {
  // 從 store 中取得更新交易狀態的函式
  const updateTransactionStatus = useTransactionStore((state) => state.updateTransactionStatus);

  // 使用 wagmi hook 監聽交易回執
  const { isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  // 當交易成功或失敗時，更新 store 中的狀態
  useEffect(() => {
    if (isSuccess) {
      updateTransactionStatus(hash, 'success');
    }
    if (isError) {
      updateTransactionStatus(hash, 'error');
    }
  }, [isSuccess, isError, hash, updateTransactionStatus]);

  return null; // 此元件為純邏輯，不渲染 UI
};


/**
 * 這是主要的監聽器元件。
 * 它會從 store 中找出所有狀態為 'pending' 的交易，
 * 然後為每一筆交易都渲染一個 TrackedTransaction 元件來追蹤它。
 */
export const TransactionWatcher: React.FC = () => {
    
  // 【修復】為了解決無限循環問題，我們不直接在 selector 中進行 filter 操作。
  // 而是先選擇完整的、未經處理的陣列。
  // 這樣可以確保從 store 拿到的永遠是同一個物件參考 (除非它真的被更新)，
  // 避免了不必要的重新渲染。
  const allTransactions = useTransactionStore((state) => state.transactions);

  // 【修復】然後，我們使用 useMemo 來快取過濾後的待處理交易列表。
  // useMemo 會記住計算結果，只有在 allTransactions 陣列本身發生變化時，才會重新執行 filter，
  // 這可以避免在每次渲染時都創建新陣列，從而打破無限渲染循環。
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
