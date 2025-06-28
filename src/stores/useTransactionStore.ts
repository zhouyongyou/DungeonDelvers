import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Hash } from 'viem';

// 定義一筆交易的狀態
export type TransactionStatus = 'pending' | 'success' | 'error';

// 定義一筆交易的完整結構
export interface Transaction {
  hash: Hash;
  description: string;
  status: TransactionStatus;
  timestamp: number;
}

// 定義 store 的狀態 (state) 和可執行的動作 (actions)
interface TransactionState {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'status' | 'timestamp'>) => void;
  updateTransactionStatus: (hash: Hash, status: TransactionStatus) => void;
  clearCompleted: () => void;
}

// 使用 zustand 的 create 函式來建立我們的 store
// 我們同時使用了 persist middleware，它可以自動將交易紀錄儲存到 localStorage
// 這樣即使用戶重新整理頁面，交易記錄也不會消失
export const useTransactionStore = create<TransactionState>()(
  persist(
    // 【修正】這裡我們只需要 set 函式，所以可以移除未使用的 get 參數
    (set) => ({
      // 初始狀態：一個空的交易陣列
      transactions: [],

      // 新增一筆交易的動作
      addTransaction: (tx) => {
        const newTx: Transaction = {
          ...tx,
          status: 'pending', // 新交易的狀態預設為 'pending'
          timestamp: Date.now(),
        };
        // 將新交易加到陣列的最前面
        set((state) => ({ transactions: [newTx, ...state.transactions] }));
      },

      // 更新交易狀態的動作
      updateTransactionStatus: (hash, status) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.hash === hash ? { ...tx, status } : tx
          ),
        }));
      },
      
      // 清除已完成 (成功或失敗) 的交易記錄
      clearCompleted: () => {
        set((state) => ({
          transactions: state.transactions.filter(
            (tx) => tx.status === 'pending'
          ),
        }));
      },
    }),
    {
      name: 'dungeon-delvers-transactions', // 在 localStorage 中的儲存名稱
    }
  )
);
