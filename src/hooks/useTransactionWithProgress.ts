// src/hooks/useTransactionWithProgress.ts - 帶進度追踪的交易 Hook

import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { useAppToast } from './useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { logger } from '../utils/logger';
import type { Abi, Address } from 'viem';

interface TransactionConfig {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: any[];
  value?: bigint;
}

interface UseTransactionWithProgressOptions {
  onSuccess?: (receipt: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  requiredConfirmations?: number;
}

export interface TransactionProgressState {
  hash?: `0x${string}`;
  status: 'idle' | 'signing' | 'pending' | 'confirming' | 'success' | 'error';
  confirmations: number;
  error?: Error;
}

/**
 * 統一的交易處理 Hook，包含進度追踪
 */
export function useTransactionWithProgress(options?: UseTransactionWithProgressOptions) {
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  // 移除 useEstimateGas，直接使用 publicClient
  
  const [progress, setProgress] = useState<TransactionProgressState>({
    status: 'idle',
    confirmations: 0,
  });
  
  const [showProgress, setShowProgress] = useState(false);
  const [actionName, setActionName] = useState('');

  const execute = useCallback(async (
    config: TransactionConfig,
    description: string
  ) => {
    try {
      // 記錄動作名稱
      setActionName(description);
      
      // 顯示進度 Modal
      setShowProgress(true);
      
      // 1. 開始簽名
      setProgress({ status: 'signing', confirmations: 0 });
      logger.info('請求用戶簽名交易', { description });
      
      // 2. 發送交易（讓錢包自動處理 gas 估算）
      const hash = await writeContractAsync(config);
      
      setProgress({ 
        hash, 
        status: 'pending', 
        confirmations: 0 
      });
      
      // 添加到交易歷史
      addTransaction({ hash, description });
      showToast('交易已提交，等待確認...', 'info');
      
      // 3. 等待確認
      if (publicClient) {
        const requiredConfirmations = options?.requiredConfirmations || 2;
        let unwatch: (() => void) | undefined;
        
        // 監聽區塊
        unwatch = publicClient.watchBlockNumber({
          onBlockNumber: async (blockNumber) => {
            try {
              const receipt = await publicClient.getTransactionReceipt({ hash });
              
              if (receipt) {
                if (receipt.status === 'reverted') {
                  setProgress({ 
                    hash, 
                    status: 'error', 
                    confirmations: 0,
                    error: new Error('Transaction reverted')
                  });
                  
                  showToast(
                    options?.errorMessage || '交易失敗', 
                    'error'
                  );
                  
                  options?.onError?.(new Error('Transaction reverted'));
                  unwatch?.();
                  return;
                }

                const currentConfirmations = Number(blockNumber - receipt.blockNumber) + 1;
                
                setProgress({
                  hash,
                  status: 'confirming',
                  confirmations: currentConfirmations,
                });

                if (currentConfirmations >= requiredConfirmations) {
                  setProgress({
                    hash,
                    status: 'success',
                    confirmations: currentConfirmations,
                  });
                  
                  showToast(
                    options?.successMessage || `${description} 成功！`, 
                    'success'
                  );
                  
                  options?.onSuccess?.(receipt);
                  
                  // 延遲關閉進度 Modal
                  setTimeout(() => {
                    setShowProgress(false);
                  }, 2000);
                  
                  unwatch?.();
                }
              }
            } catch (err) {
              // 只記錄非 TransactionReceiptNotFoundError 的錯誤
              if (err instanceof Error && !err.message.includes('Transaction receipt with hash')) {
                logger.error('檢查交易狀態時出錯', err);
              }
            }
          },
          emitOnBegin: true,
        });

        // 30 秒超時
        setTimeout(() => {
          if (progress.status !== 'success' && progress.status !== 'error') {
            unwatch?.();
            setProgress(prev => ({
              ...prev,
              status: 'error',
              error: new Error('Transaction timeout'),
            }));
            showToast('交易超時，請在區塊鏈瀏覽器查看', 'warning');
            setShowProgress(false);
          }
        }, 30000);
      }
      
      return hash;
      
    } catch (error: any) {
      const errorMessage = error.shortMessage || error.message || '交易失敗';
      
      // 開發環境下記錄完整錯誤訊息，幫助識別新的錢包格式
      if (import.meta.env.DEV) {
        console.log('🔴 交易錯誤詳情:', {
          errorMessage,
          shortMessage: error.shortMessage,
          message: error.message,
          code: error.code,
          cause: error.cause,
          fullError: error
        });
      }
      
      setProgress({
        status: 'error',
        confirmations: 0,
        error,
      });
      
      // 檢查是否為用戶取消 - 優化版本
      let isUserRejection = false;
      
      // 1. 先檢查標準錯誤碼（最可靠且最快的方式）
      if (error.code === 4001 || 
          error.code === 'ACTION_REJECTED' ||
          error.cause?.code === 4001 ||
          errorMessage.includes('4001')) {
        isUserRejection = true;
      } else {
        // 2. 使用正則表達式進行高效匹配
        const errorMessageLower = errorMessage.toLowerCase();
        
        // 用戶取消的關鍵詞模式
        const rejectionPatterns = [
          /user\s*(rejected|denied|cancel|canceled|cancelled|refused|disapproved)/i,
          /transaction\s*(rejected|declined|cancelled|denied)/i,
          /(reject|cancel|decline|deny|refuse|abort|disapprov).*(?:by\s*)?(?:the\s*)?user/i,
          /用[户戶]\s*取消/,  // 中文：用户取消 / 用戶取消
          /拒[绝絕]/,         // 中文：拒绝 / 拒絕
          /取消/              // 中文：取消
        ];
        
        // 3. 檢查是否匹配任一模式
        const hasRejectionMessage = rejectionPatterns.some(pattern => pattern.test(errorMessage));
        
        // 4. 額外檢查一些不適合正則的特殊情況
        const hasSpecialCase = 
          errorMessage === 'cancel' || // 某些錢包只返回 "cancel"
          errorMessage === 'User cancel' ||
          errorMessageLower === 'cancelled' ||
          errorMessageLower === 'user denied';
        
        isUserRejection = hasRejectionMessage || hasSpecialCase;
      }
      
      if (isUserRejection) {
        // 用戶取消交易 - 重置所有狀態並關閉 Modal
        logger.info('用戶取消了交易');
        showToast('交易已取消', 'info');
        
        // 立即關閉進度 Modal
        setShowProgress(false);
        
        // 重置進度狀態為 idle
        setProgress({
          status: 'idle',
          confirmations: 0,
        });
      } else {
        // 🎯 智能錯誤提示 - 直接在現有邏輯中改進
        let userFriendlyMessage = options?.errorMessage || errorMessage;
        
        if (errorMessage.includes('insufficient funds')) {
          userFriendlyMessage = 'BNB 餘額不足支付手續費，請充值後重試';
        } else if (errorMessage.includes('execution reverted')) {
          if (errorMessage.includes('Not party owner')) {
            userFriendlyMessage = '您不是該隊伍的擁有者，無法執行此操作';
          } else if (errorMessage.includes('Insufficient allowance')) {
            userFriendlyMessage = '請先授權合約使用您的代幣';
          } else if (errorMessage.includes('Party on cooldown')) {
            userFriendlyMessage = '隊伍正在冷卻中，請稍後再試';
          } else {
            userFriendlyMessage = '操作被智能合約拒絕，請檢查操作條件';
          }
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          userFriendlyMessage = '網路連接問題，請檢查網路後重試';
        } else if (errorMessage.includes('timeout')) {
          userFriendlyMessage = '交易確認超時，請查看區塊鏈瀏覽器確認狀態';
        }
        
        showToast(userFriendlyMessage, 'error');
        options?.onError?.(error);
      }
      
      setShowProgress(false);
      throw error;
    }
  }, [writeContractAsync, publicClient, showToast, addTransaction, options]);

  const reset = useCallback(() => {
    setProgress({
      status: 'idle',
      confirmations: 0,
    });
    setShowProgress(false);
  }, []);

  return {
    execute,
    progress,
    reset,
    isLoading: progress.status === 'signing' || progress.status === 'pending' || progress.status === 'confirming',
    showProgress,
    setShowProgress,
    status: progress.status,
    error: progress.error,
    txHash: progress.hash,
    actionName,
  };
}