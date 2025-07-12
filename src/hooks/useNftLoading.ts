import React from 'react';

// 智能重試 Hook
export const useSmartRetry = (maxRetries: number = 3) => {
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [lastRetryTime, setLastRetryTime] = React.useState(0);
  
  const retry = React.useCallback(() => {
    if (retryCount < maxRetries) {
      const now = Date.now();
      // 防止過於頻繁的重試（至少間隔1秒）
      if (now - lastRetryTime < 1000) {
        console.warn('重試過於頻繁，請稍後再試');
        return;
      }
      
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
      setLastRetryTime(now);
      
      // 指數退避延遲
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      setTimeout(() => setIsRetrying(false), delay);
      
      console.log(`執行第 ${retryCount + 1} 次重試，延遲 ${delay}ms`);
    }
  }, [retryCount, maxRetries, lastRetryTime]);
  
  const reset = React.useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setLastRetryTime(0);
  }, []);
  
  return {
    retryCount,
    isRetrying,
    canRetry: retryCount < maxRetries,
    retry,
    reset,
    nextRetryDelay: Math.min(1000 * Math.pow(2, retryCount), 5000)
  };
};

// NFT 載入狀態管理 Hook
export const useNftLoadingState = (initialType: 'loading' | 'error' | 'retry' | 'success' | 'offline' = 'loading') => {
  const [loadingState, setLoadingState] = React.useState<{
    type: 'loading' | 'error' | 'retry' | 'success' | 'offline';
    message?: string;
    progress?: number;
  }>({ type: initialType });
  
  const setLoading = React.useCallback((message?: string, progress?: number) => {
    setLoadingState({ type: 'loading', message, progress });
  }, []);
  
  const setError = React.useCallback((message?: string) => {
    setLoadingState({ type: 'error', message });
  }, []);
  
  const setRetrying = React.useCallback((message?: string) => {
    setLoadingState({ type: 'retry', message });
  }, []);
  
  const setSuccess = React.useCallback((message?: string) => {
    setLoadingState({ type: 'success', message });
  }, []);
  
  const setOffline = React.useCallback((message?: string) => {
    setLoadingState({ type: 'offline', message });
  }, []);
  
  return {
    ...loadingState,
    setLoading,
    setError,
    setRetrying,
    setSuccess,
    setOffline
  };
}; 