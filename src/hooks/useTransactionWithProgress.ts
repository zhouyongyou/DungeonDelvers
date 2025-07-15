// src/hooks/useTransactionWithProgress.ts - 帶進度追踪的交易 Hook

import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient, useEstimateGas } from 'wagmi';
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
  gas?: bigint; // 允許手動指定 gas
}

interface UseTransactionWithProgressOptions {
  onSuccess?: (receipt: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  requiredConfirmations?: number;
  gasBuffer?: number; // gas 緩衝百分比，預設 20%
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
  const { estimateGasAsync } = useEstimateGas();
  
  const [progress, setProgress] = useState<TransactionProgressState>({
    status: 'idle',
    confirmations: 0,
  });

  const execute = useCallback(async (
    config: TransactionConfig,
    description: string
  ) => {
    try {
      // 1. 估算 Gas（如果沒有手動指定）
      let finalConfig = { ...config };
      if (!config.gas && publicClient) {
        try {
          logger.debug('開始估算 Gas', { description });
          const estimatedGas = await estimateGasAsync({
            address: config.address,
            abi: config.abi,
            functionName: config.functionName,
            args: config.args,
            value: config.value,
          });
          
          // 添加緩衝（預設 20%）
          const gasBuffer = options?.gasBuffer || 20;
          const gasWithBuffer = estimatedGas * BigInt(100 + gasBuffer) / 100n;
          
          finalConfig.gas = gasWithBuffer;
          logger.info('Gas 估算完成', { 
            estimated: estimatedGas.toString(), 
            withBuffer: gasWithBuffer.toString(),
            bufferPercent: gasBuffer 
          });
        } catch (gasError) {
          logger.warn('Gas 估算失敗，使用預設值', gasError);
          // 如果估算失敗，不設定 gas，讓錢包自行處理
        }
      }
      
      // 2. 開始簽名
      setProgress({ status: 'signing', confirmations: 0 });
      logger.info('請求用戶簽名交易', { description });
      
      // 3. 發送交易
      const hash = await writeContractAsync(finalConfig);
      
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
                  unwatch?.();
                }
              }
            } catch (err) {
              logger.error('檢查交易狀態時出錯', err);
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
          }
        }, 30000);
      }
      
      return hash;
      
    } catch (error: any) {
      const errorMessage = error.shortMessage || error.message || '交易失敗';
      
      setProgress({
        status: 'error',
        confirmations: 0,
        error,
      });
      
      if (!errorMessage.includes('User rejected')) {
        showToast(
          options?.errorMessage || errorMessage, 
          'error'
        );
        options?.onError?.(error);
      }
      
      throw error;
    }
  }, [writeContractAsync, publicClient, showToast, addTransaction, options, estimateGasAsync]);

  const reset = useCallback(() => {
    setProgress({
      status: 'idle',
      confirmations: 0,
    });
  }, []);

  return {
    execute,
    progress,
    reset,
    isLoading: progress.status === 'signing' || progress.status === 'pending' || progress.status === 'confirming',
  };
}