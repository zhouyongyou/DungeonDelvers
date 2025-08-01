// src/hooks/useOptimisticUpdate.ts - 樂觀更新 Hook

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logger';

interface UseOptimisticUpdateOptions {
  queryKey: any[];
  updateFn: (oldData: any) => any;
  revertDelay?: number; // 如果失敗，多久後回滾
}

/**
 * 樂觀更新 Hook - 解決 RPC 延遲問題
 * 
 * 使用場景：
 * 1. 用戶鑄造 NFT 後，立即在 UI 顯示新 NFT
 * 2. 用戶創建隊伍後，立即顯示新隊伍
 * 3. 任何需要等待鏈上確認的操作
 */
export function useOptimisticUpdate<T = any>({
  queryKey,
  updateFn,
  revertDelay = 60000, // 60 秒後回滾（增加到 60 秒以應對網路延遲）
}: UseOptimisticUpdateOptions) {
  const queryClient = useQueryClient();
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [revertTimer, setRevertTimer] = useState<NodeJS.Timeout | null>(null);

  // 執行樂觀更新
  const optimisticUpdate = useCallback((data?: any) => {
    logger.debug('執行樂觀更新', { queryKey, data });
    
    // 清除之前的回滾計時器
    if (revertTimer) {
      clearTimeout(revertTimer);
    }

    // 更新快取
    queryClient.setQueryData(queryKey, (oldData: T) => {
      const newData = updateFn(oldData);
      logger.debug('樂觀更新數據', { oldData, newData });
      return newData;
    });

    setIsOptimistic(true);

    // 設置回滾計時器
    const timer = setTimeout(() => {
      // 對於批量鑄造，給予更友善的提示
      const isLargeQuantity = Array.isArray(queryKey) && queryKey.length > 0;
      logger.info('樂觀更新自動清理', { 
        queryKey, 
        timeoutSeconds: revertDelay / 1000,
        message: '交易已完成，清理臨時數據' 
      });
      rollback(true); // 傳遞靜默標誌
    }, revertDelay);

    setRevertTimer(timer);
  }, [queryKey, updateFn, revertDelay, revertTimer]);

  // 確認更新成功
  const confirmUpdate = useCallback(() => {
    logger.debug('確認樂觀更新成功', { queryKey });
    
    if (revertTimer) {
      clearTimeout(revertTimer);
      setRevertTimer(null);
    }
    
    setIsOptimistic(false);
    
    // 重新獲取數據以確保同步
    queryClient.invalidateQueries({ queryKey });
  }, [queryKey, revertTimer]);

  // 回滾更新
  const rollback = useCallback((silent = false) => {
    if (!silent) {
      logger.debug('回滾樂觀更新', { queryKey });
    }
    
    if (revertTimer) {
      clearTimeout(revertTimer);
      setRevertTimer(null);
    }
    
    setIsOptimistic(false);
    
    // 使快取失效，強制重新獲取
    queryClient.invalidateQueries({ queryKey });
  }, [queryKey, revertTimer]);

  return {
    optimisticUpdate,
    confirmUpdate,
    rollback,
    isOptimistic,
  };
}

/**
 * 使用示例：
 * 
 * const { optimisticUpdate, confirmUpdate, rollback } = useOptimisticUpdate({
 *   queryKey: ['ownedNfts', address],
 *   updateFn: (oldNfts) => ({
 *     ...oldNfts,
 *     heroes: [...oldNfts.heroes, newHero],
 *   }),
 * });
 * 
 * // 發送交易時
 * optimisticUpdate(newHero);
 * 
 * // 交易成功時
 * confirmUpdate();
 * 
 * // 交易失敗時
 * rollback();
 */