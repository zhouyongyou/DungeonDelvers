import { create } from 'zustand';

export type TransactionStatus = 'pending' | 'success' | 'error';

export interface Transaction {
  hash: string;
  description: string;
  status: TransactionStatus;
  timestamp: number;
}

interface TransactionStore {
  transactions: Transaction[];
  addTransaction: (hash: string, description: string) => void;
  updateTransactionStatus: (hash: string, status: TransactionStatus) => void;
  clearCompleted: () => void;
  clearAll: () => void;
}

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],
  
  addTransaction: (hash: string, description: string) => {
    const newTransaction: Transaction = {
      hash,
      description,
      status: 'pending',
      timestamp: Date.now(),
    };
    
    set((state) => ({
      transactions: [newTransaction, ...state.transactions],
    }));
  },
  
  updateTransactionStatus: (hash: string, status: TransactionStatus) => {
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.hash === hash ? { ...tx, status } : tx
      ),
    }));
  },
  
  clearCompleted: () => {
    set((state) => ({
      transactions: state.transactions.filter((tx) => tx.status === 'pending'),
    }));
  },
  
  clearAll: () => {
    set({ transactions: [] });
  },
})); 