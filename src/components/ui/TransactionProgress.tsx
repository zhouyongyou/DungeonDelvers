// src/components/ui/TransactionProgress.tsx - 交易進度組件

import React, { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { LoadingSpinner } from './LoadingSpinner';
import { Icons } from './icons';

interface TransactionProgressProps {
  hash: `0x${string}`;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  requiredConfirmations?: number;
}

export const TransactionProgress: React.FC<TransactionProgressProps> = ({
  hash,
  onSuccess,
  onError,
  requiredConfirmations = 2,
}) => {
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<'pending' | 'confirming' | 'success' | 'error'>('pending');
  const [confirmations, setConfirmations] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!publicClient) return;

    let unwatch: (() => void) | undefined;

    const watchTransaction = async () => {
      try {
        // 監聽交易狀態
        unwatch = publicClient.watchBlockNumber({
          onBlockNumber: async (blockNumber) => {
            try {
              const receipt = await publicClient.getTransactionReceipt({ hash });
              
              if (receipt) {
                if (receipt.status === 'reverted') {
                  setStatus('error');
                  setError(new Error('Transaction reverted'));
                  onError?.(new Error('Transaction reverted'));
                  unwatch?.();
                  return;
                }

                const currentConfirmations = Number(blockNumber - receipt.blockNumber) + 1;
                setConfirmations(currentConfirmations);
                setStatus('confirming');

                if (currentConfirmations >= requiredConfirmations) {
                  setStatus('success');
                  onSuccess?.();
                  unwatch?.();
                }
              }
            } catch (err) {
              console.error('Error checking transaction:', err);
            }
          },
        });

        // 初始檢查
        const receipt = await publicClient.getTransactionReceipt({ hash });
        if (receipt) {
          if (receipt.status === 'reverted') {
            setStatus('error');
            setError(new Error('Transaction reverted'));
            onError?.(new Error('Transaction reverted'));
          } else {
            setStatus('confirming');
            const block = await publicClient.getBlock();
            const currentConfirmations = Number(block.number - receipt.blockNumber) + 1;
            setConfirmations(currentConfirmations);
            
            if (currentConfirmations >= requiredConfirmations) {
              setStatus('success');
              onSuccess?.();
            }
          }
        }
      } catch (err) {
        setStatus('error');
        setError(err as Error);
        onError?.(err as Error);
      }
    };

    watchTransaction();

    return () => {
      unwatch?.();
    };
  }, [hash, publicClient, requiredConfirmations, onSuccess, onError]);

  const getExplorerUrl = () => {
    return `https://bscscan.com/tx/${hash}`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <LoadingSpinner size="h-5 w-5" />;
      case 'confirming':
        return <div className="animate-pulse">⏳</div>;
      case 'success':
        return <Icons.Check className="h-5 w-5 text-green-500" />;
      case 'error':
        return <Icons.X className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return '交易待處理...';
      case 'confirming':
        return `確認中 (${confirmations}/${requiredConfirmations})`;
      case 'success':
        return '交易成功！';
      case 'error':
        // 將技術性錯誤轉換為友好訊息
        if (error?.message) {
          const msg = error.message;
          if (msg.includes('Transaction receipt with hash') && msg.includes('could not be found')) {
            return '交易正在等待區塊確認，請耐心等待...';
          } else if (msg.includes('reverted')) {
            return '交易被區塊鏈拒絕';
          } else if (msg.includes('insufficient funds')) {
            return 'BNB 餘額不足';
          } else if (msg.includes('User rejected')) {
            return '您已取消交易';
          } else if (msg.includes('timeout')) {
            return '交易確認超時';
          }
        }
        return '交易失敗';
    }
  };

  const getProgressPercentage = () => {
    if (status === 'success') return 100;
    if (status === 'error') return 0;
    return Math.min((confirmations / requiredConfirmations) * 100, 90);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        <a
          href={getExplorerUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          查看詳情
          <Icons.ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* 進度條 */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            status === 'error' ? 'bg-red-500' : 
            status === 'success' ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      {/* 交易哈希 */}
      <div className="text-xs text-gray-400 font-mono truncate">
        {hash.slice(0, 10)}...{hash.slice(-8)}
      </div>
    </div>
  );
};