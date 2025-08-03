// src/hooks/useContractError.ts - 統一的合約錯誤處理

import { useCallback } from 'react';
import { useAppToast } from '../contexts/SimpleToastContext';

interface ContractError {
  message?: string;
  shortMessage?: string;
  details?: {
    message?: string;
  };
}

/**
 * 統一的合約錯誤處理 Hook
 * 自動過濾 "User rejected" 錯誤，避免重複彈窗
 */
export function useContractError() {
  const { showToast } = useAppToast();

  const handleError = useCallback((
    error: ContractError | unknown,
    customMessage?: string
  ) => {
    const e = error as ContractError;
    
    // 檢查各種可能的 "User rejected" 訊息格式
    const isUserRejected = 
      e?.message?.includes('User rejected') ||
      e?.message?.includes('user rejected') ||
      e?.message?.includes('User denied') ||
      e?.message?.includes('user denied') ||
      e?.shortMessage?.includes('User rejected') ||
      e?.shortMessage?.includes('user rejected') ||
      e?.details?.message?.includes('User rejected') ||
      e?.details?.message?.includes('user rejected');

    // 檢查是否為交易確認錯誤
    const isConfirmationError = 
      e?.message?.includes('Cannot convert undefined to a BigInt') ||
      e?.message?.includes('waitForTransactionReceipt') ||
      e?.message?.includes('getTransaction') ||
      e?.message?.includes('numberToHex');

    if (!isUserRejected) {
      if (isConfirmationError) {
        // 交易確認錯誤 - 提供更友好的提示
        showToast(
          '🔄 交易可能已成功，但確認過程中出現問題。建議刷新頁面查看最新狀態。', 
          'warning'
        );
        
        // 5秒後顯示刷新提示
        setTimeout(() => {
          showToast(
            '💡 如果狀態未更新，請手動刷新頁面 (F5 或 Ctrl+R)', 
            'info'
          );
        }, 5000);
      } else {
        const errorMessage = customMessage || 
                            e?.shortMessage || 
                            e?.message || 
                            '操作失敗';
        showToast(errorMessage, 'error');
      }
    }
  }, [showToast]);

  return { handleError };
}