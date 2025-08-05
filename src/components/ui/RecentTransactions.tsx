// src/components/ui/RecentTransactions.tsx (Bug 修復版)

import React from 'react';
import { useAccount } from 'wagmi';
import { useTransactionStore, type Transaction, type TransactionStatus } from '../../stores/useTransactionStore';
import { LoadingSpinner } from './LoadingSpinner';
import { Icons } from './icons'; // ★ 核心修正：導入整個 Icons 物件

// 格式化時間顯示（相對時間 + 絕對時間）
const formatTransactionTime = (timestamp: number): { relative: string; absolute: string } => {
  const now = Date.now();
  const txTime = new Date(timestamp);
  const diff = now - timestamp;
  
  // 計算相對時間
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  let relative: string;
  if (minutes < 1) {
    relative = '剛剛';
  } else if (minutes < 60) {
    relative = `${minutes}分鐘前`;
  } else if (hours < 24) {
    relative = `${hours}小時前`;
  } else if (days < 7) {
    relative = `${days}天前`;
  } else {
    relative = txTime.toLocaleDateString('zh-TW', { 
      month: 'numeric', 
      day: 'numeric' 
    });
  }
  
  // 絕對時間 - 包含日期和時間
  const isToday = txTime.toDateString() === new Date().toDateString();
  const isYesterday = new Date(now - 24 * 60 * 60 * 1000).toDateString() === txTime.toDateString();
  
  let absolute: string;
  if (isToday) {
    absolute = `今天 ${txTime.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else if (isYesterday) {
    absolute = `昨天 ${txTime.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  } else {
    absolute = txTime.toLocaleString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  
  return { relative, absolute };
};

// 交易狀態對應的圖示和顏色
const statusInfo: Record<TransactionStatus, { icon: React.ReactNode; color: string }> = {
  pending: { icon: <LoadingSpinner size="h-4 w-4" />, color: 'text-blue-500' },
  success: { icon: <span className="text-green-500">✅</span>, color: 'text-green-500' },
  error: { icon: <span className="text-red-500">❌</span>, color: 'text-red-500' },
};

// 單筆交易的顯示元件
const TransactionItem: React.FC<{ tx: Transaction; explorerUrl?: string }> = ({ tx, explorerUrl }) => {
  const { icon, color } = statusInfo[tx.status];
  const { relative, absolute } = formatTransactionTime(tx.timestamp);

  return (
    <li className="flex items-center justify-between gap-2 py-2 px-3 hover:bg-white/10 rounded-md">
      <div className="flex items-center gap-2">
        <div className={`flex-shrink-0 w-5 h-5 flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div className="text-sm">
          <p className="font-medium text-gray-200">{tx.description}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">{relative}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-500" title={new Date(tx.timestamp).toLocaleString('zh-TW')}>
              {absolute}
            </span>
          </div>
        </div>
      </div>
      {explorerUrl && (
        <a
          href={`${explorerUrl}/tx/${tx.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-gray-400 hover:text-indigo-500"
          aria-label="View on explorer"
        >
          {/* ★ 核心修正：正確使用 Icons.ExternalLink */}
          <Icons.ExternalLink className="w-4 h-4" />
        </a>
      )}
    </li>
  );
};

// 整個交易列表的彈出框
export const RecentTransactions: React.FC = () => {
  const { transactions, clearCompleted } = useTransactionStore();
  const { chain } = useAccount();

  const explorerUrl = chain?.blockExplorers?.default.url;

  return (
          <div className="w-full sm:absolute sm:top-full sm:right-0 sm:mt-2 sm:w-80 max-w-none sm:max-w-none bg-gray-800/95 backdrop-blur-lg shadow-2xl rounded-xl border border-white/10 z-[60] overflow-hidden">
              <div className="p-3 border-b border-white/10 flex justify-between items-center">
                    <h4 className="font-bold text-base text-gray-200">最近交易</h4>
        <button
          onClick={clearCompleted}
          className="text-xs text-indigo-500 hover:text-indigo-400 disabled:text-gray-400"
          disabled={!transactions.some(tx => tx.status !== 'pending')}
        >
          清除已完成
        </button>
      </div>
      {transactions.length > 0 ? (
        <ul className="p-1 max-h-80 overflow-y-auto">
          {transactions.map((tx: Transaction) => (
            <TransactionItem key={tx.hash} tx={tx} explorerUrl={explorerUrl} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-center text-gray-500 p-4">沒有最近的交易記錄。</p>
      )}
    </div>
  );
};