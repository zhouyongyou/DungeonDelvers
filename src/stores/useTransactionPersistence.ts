// src/stores/useTransactionPersistence.ts
// 交易狀態持久化 - 防止頁面刷新丟失交易進度

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { logger } from '../utils/logger';

export interface PersistedTransaction {
  id: string;
  hash?: string;
  type: 'expedition' | 'upgrade' | 'mint' | 'approve' | 'claim' | 'createParty' | 'other';
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  
  // 交易詳情
  description: string;
  value?: string; // 交易金額（如果有）
  gasPrice?: string;
  gasLimit?: string;
  
  // 時間戳
  createdAt: number;
  updatedAt: number;
  confirmedAt?: number;
  
  // 錯誤信息
  error?: string;
  
  // 關聯數據
  relatedData?: Record<string, any>;
  
  // 用戶地址
  userAddress: string;
  chainId: number;
}

interface TransactionState {
  // 交易列表
  transactions: PersistedTransaction[];
  
  // 操作方法
  addTransaction: (tx: Omit<PersistedTransaction, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTransaction: (id: string, updates: Partial<PersistedTransaction>) => void;
  removeTransaction: (id: string) => void;
  clearOldTransactions: (maxAge?: number) => void;
  clearUserTransactions: (userAddress: string) => void;
  
  // 查詢方法
  getTransaction: (id: string) => PersistedTransaction | undefined;
  getPendingTransactions: (userAddress?: string) => PersistedTransaction[];
  getTransactionsByType: (type: PersistedTransaction['type'], userAddress?: string) => PersistedTransaction[];
  getRecentTransactions: (userAddress?: string, limit?: number) => PersistedTransaction[];
  
  // 統計方法
  getTransactionStats: (userAddress?: string) => {
    total: number;
    pending: number;
    success: number;
    failed: number;
  };
}

const MAX_TRANSACTIONS = 1000; // 最大存儲交易數
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7天

export const useTransactionPersistence = create<TransactionState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      transactions: [],

      addTransaction: (txData) => {
        const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const now = Date.now();
        
        const transaction: PersistedTransaction = {
          ...txData,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => {
          const newTransactions = [...state.transactions, transaction];
          
          // 如果超過最大數量，移除舊的交易
          if (newTransactions.length > MAX_TRANSACTIONS) {
            newTransactions.sort((a, b) => b.createdAt - a.createdAt);
            newTransactions.splice(MAX_TRANSACTIONS);
          }
          
          return { transactions: newTransactions };
        });

        logger.info(`Added transaction: ${id} (${txData.type})`, transaction);
        return id;
      },

      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id
              ? { ...tx, ...updates, updatedAt: Date.now() }
              : tx
          ),
        }));

        const updatedTx = get().getTransaction(id);
        if (updatedTx) {
          logger.info(`Updated transaction: ${id}`, { updates, transaction: updatedTx });
        }
      },

      removeTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        }));
        logger.info(`Removed transaction: ${id}`);
      },

      clearOldTransactions: (maxAge = DEFAULT_MAX_AGE) => {
        const cutoff = Date.now() - maxAge;
        set((state) => ({
          transactions: state.transactions.filter((tx) => {
            // 保留 pending 交易，即使它們很舊
            if (tx.status === 'pending') return true;
            return tx.createdAt > cutoff;
          }),
        }));
        logger.info(`Cleared transactions older than ${maxAge}ms`);
      },

      clearUserTransactions: (userAddress) => {
        set((state) => ({
          transactions: state.transactions.filter(
            (tx) => tx.userAddress.toLowerCase() !== userAddress.toLowerCase()
          ),
        }));
        logger.info(`Cleared transactions for user: ${userAddress}`);
      },

      // 查詢方法
      getTransaction: (id) => {
        return get().transactions.find((tx) => tx.id === id);
      },

      getPendingTransactions: (userAddress) => {
        const transactions = get().transactions;
        return transactions.filter((tx) => {
          if (tx.status !== 'pending') return false;
          if (userAddress && tx.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
            return false;
          }
          return true;
        });
      },

      getTransactionsByType: (type, userAddress) => {
        const transactions = get().transactions;
        return transactions.filter((tx) => {
          if (tx.type !== type) return false;
          if (userAddress && tx.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
            return false;
          }
          return true;
        });
      },

      getRecentTransactions: (userAddress, limit = 10) => {
        let transactions = get().transactions;
        
        if (userAddress) {
          transactions = transactions.filter(
            (tx) => tx.userAddress.toLowerCase() === userAddress.toLowerCase()
          );
        }
        
        return transactions
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, limit);
      },

      getTransactionStats: (userAddress) => {
        let transactions = get().transactions;
        
        if (userAddress) {
          transactions = transactions.filter(
            (tx) => tx.userAddress.toLowerCase() === userAddress.toLowerCase()
          );
        }

        return {
          total: transactions.length,
          pending: transactions.filter((tx) => tx.status === 'pending').length,
          success: transactions.filter((tx) => tx.status === 'success').length,
          failed: transactions.filter((tx) => tx.status === 'failed').length,
        };
      },
    })),
    {
      name: 'dd-transaction-persistence',
      version: 1,
      partialize: (state) => ({
        transactions: state.transactions,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 啟動時清理舊交易
          state.clearOldTransactions();
          logger.info(`Rehydrated ${state.transactions.length} transactions`);
        }
      },
    }
  )
);

// React Hook 封裝
export const useTransactionHistory = (userAddress?: string) => {
  const store = useTransactionPersistence();
  
  return {
    // 基本操作
    addTransaction: store.addTransaction,
    updateTransaction: store.updateTransaction,
    removeTransaction: store.removeTransaction,
    
    // 用戶相關查詢
    pendingTransactions: store.getPendingTransactions(userAddress),
    recentTransactions: store.getRecentTransactions(userAddress),
    transactionStats: store.getTransactionStats(userAddress),
    
    // 工具方法
    getTransaction: store.getTransaction,
    clearUserTransactions: () => userAddress && store.clearUserTransactions(userAddress),
  };
};

// 專用 Hook - 監控特定交易
export const useTransactionMonitor = (transactionId?: string) => {
  const transaction = useTransactionPersistence(
    (state) => transactionId ? state.getTransaction(transactionId) : undefined
  );
  
  const updateTransaction = useTransactionPersistence((state) => state.updateTransaction);
  
  return {
    transaction,
    updateTransaction: transactionId 
      ? (updates: Partial<PersistedTransaction>) => updateTransaction(transactionId, updates)
      : undefined,
    isPending: transaction?.status === 'pending',
    isCompleted: transaction && ['success', 'failed', 'cancelled'].includes(transaction.status),
  };
};

// 便捷函數 - 創建交易記錄
export const createTransactionRecord = (
  type: PersistedTransaction['type'],
  description: string,
  userAddress: string,
  chainId: number,
  additionalData?: Record<string, any>
): Omit<PersistedTransaction, 'id' | 'createdAt' | 'updatedAt'> => ({
  type,
  description,
  userAddress,
  chainId,
  status: 'pending',
  relatedData: additionalData,
});

// 自動清理服務
export const setupTransactionCleanup = () => {
  const store = useTransactionPersistence.getState();
  
  // 每小時清理一次舊交易
  const cleanup = () => {
    store.clearOldTransactions();
  };
  
  // 立即執行一次
  cleanup();
  
  // 設置定時清理
  const interval = setInterval(cleanup, 60 * 60 * 1000); // 1小時
  
  // 返回清理函數
  return () => clearInterval(interval);
};