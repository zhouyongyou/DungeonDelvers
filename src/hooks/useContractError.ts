// src/hooks/useContractError.ts - 統一的合約錯誤處理

import { useCallback } from 'react';
import { useAppToast } from './useAppToast';

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

    if (!isUserRejected) {
      const errorMessage = customMessage || 
                          e?.shortMessage || 
                          e?.message || 
                          '操作失敗';
      showToast(errorMessage, 'error');
    }
  }, [showToast]);

  return { handleError };
}