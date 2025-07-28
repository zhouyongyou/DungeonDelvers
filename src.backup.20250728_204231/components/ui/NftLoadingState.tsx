import React from 'react';
import { logger } from '../../utils/logger';

interface NftLoadingStateProps {
  type: 'loading' | 'error' | 'retry' | 'success' | 'offline';
  message?: string;
  onRetry?: () => void;
  retryCount?: number;
  maxRetries?: number;
  progress?: number;
  nftType?: 'hero' | 'relic' | 'party' | 'vip';
}

export const NftLoadingState: React.FC<NftLoadingStateProps> = ({ 
  type, 
  message, 
  onRetry, 
  retryCount = 0, 
  maxRetries = 3,
  progress = 0,
  nftType = 'hero'
}) => {
  const baseClasses = "w-full h-full bg-gray-700 rounded-lg flex flex-col items-center justify-center p-4 transition-all duration-300";
  
  const getIconForNftType = () => {
    const iconClasses = "w-8 h-8 mb-2";
    switch (nftType) {
      case 'hero': return <div className={`${iconClasses} bg-blue-400 rounded-full`} />;
      case 'relic': return <div className={`${iconClasses} bg-purple-400 rounded-full`} />;
      case 'party': return <div className={`${iconClasses} bg-green-400 rounded-full`} />;
      case 'vip': return <div className={`${iconClasses} bg-yellow-400 rounded-full`} />;
      default: return <div className={`${iconClasses} bg-gray-400 rounded-full`} />;
    }
  };

  const getDefaultMessage = () => {
    const typeNames = {
      hero: '英雄',
      relic: '聖物',
      party: '隊伍',
      vip: 'VIP 卡'
    };
    
    switch (type) {
      case 'loading': return `載入${typeNames[nftType]}中...`;
      case 'retry': return `重試載入${typeNames[nftType]}...`;
      case 'error': return `${typeNames[nftType]}載入失敗`;
      case 'offline': return '網路連接中斷';
      case 'success': return `${typeNames[nftType]}載入成功`;
      default: return '處理中...';
    }
  };

  switch (type) {
    case 'loading':
      return (
        <div className={baseClasses}>
          <div className="relative">
            <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mb-2"></div>
            {progress > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-yellow-400 font-bold">{Math.round(progress)}%</span>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400 text-center">{message || getDefaultMessage()}</span>
          {progress > 0 && (
            <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
              <div 
                className="bg-yellow-400 h-1 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      );
    
    case 'error':
      return (
        <div className={`${baseClasses} border border-red-500/30`}>
          <div className="text-red-400 text-2xl mb-2">⚠️</div>
          <span className="text-xs text-red-400 text-center mb-2">{message || getDefaultMessage()}</span>
          {retryCount < maxRetries && onRetry && (
            <div className="flex flex-col items-center gap-1">
              <button 
                onClick={onRetry}
                className="text-xs text-blue-400 hover:text-blue-300 underline px-2 py-1 rounded transition-colors hover:bg-blue-900/20"
              >
                重試 ({retryCount + 1}/{maxRetries})
              </button>
              <span className="text-xs text-gray-500">點擊重試載入</span>
            </div>
          )}
          {retryCount >= maxRetries && (
            <span className="text-xs text-gray-500">已達到最大重試次數</span>
          )}
        </div>
      );
    
    case 'retry':
      return (
        <div className={baseClasses}>
          <div className="animate-pulse w-8 h-8 bg-yellow-400 rounded-full mb-2"></div>
          <span className="text-xs text-yellow-400">{message || getDefaultMessage()}</span>
          <span className="text-xs text-gray-500 mt-1">第 {retryCount + 1} 次嘗試</span>
          <div className="flex space-x-1 mt-2">
            {Array.from({ length: maxRetries }).map((_: unknown, i: number) => (
              <div 
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i <= retryCount ? 'bg-yellow-400' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      );
    
    case 'offline':
      return (
        <div className={`${baseClasses} border border-orange-500/30`}>
          <div className="text-orange-400 text-2xl mb-2">📶</div>
          <span className="text-xs text-orange-400 text-center mb-2">{message || getDefaultMessage()}</span>
          <span className="text-xs text-gray-500 text-center">請檢查網路連接</span>
        </div>
      );
    
    case 'success':
      return (
        <div className={`${baseClasses} border border-green-500/30`}>
          <div className="text-green-400 text-2xl mb-2">✅</div>
          <span className="text-xs text-green-400 text-center">{message || getDefaultMessage()}</span>
        </div>
      );
    
    default:
      return (
        <div className={baseClasses}>
          {getIconForNftType()}
          <span className="text-xs text-gray-400">{message || '載入中...'}</span>
        </div>
      );
  }
};

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
        // eslint-disable-next-line no-console
      logger.warn('重試過於頻繁，請稍後再試');
        return;
      }
      
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
      setLastRetryTime(now);
      
      // 指數退避延遲
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      setTimeout(() => setIsRetrying(false), delay);
      
      // eslint-disable-next-line no-console

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
export const useNftLoadingState = (initialType: NftLoadingStateProps['type'] = 'loading') => {
  const [loadingState, setLoadingState] = React.useState<{
    type: NftLoadingStateProps['type'];
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