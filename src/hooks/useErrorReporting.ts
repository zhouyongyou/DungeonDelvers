// useErrorReporting.ts - 錯誤報告和監控 Hook
import { useCallback, useEffect } from 'react';
import { useAppToast } from '../contexts/SimpleToastContext';
import { errorHandler, ProcessedError, ErrorContext } from '../utils/errorHandler';
import { logger } from '../utils/logger';

interface ErrorReportOptions {
  showToast?: boolean;
  autoRetry?: boolean;
  context?: ErrorContext;
}

export const useErrorReporting = () => {
  const { showToast } = useAppToast();

  // 報告錯誤並顯示用戶友好的提示
  const reportError = useCallback((
    error: Error,
    options: ErrorReportOptions = {}
  ) => {
    const { showToast: shouldShowToast = true, autoRetry = true, context } = options;
    
    const processedError = errorHandler.processError(error, context);
    
    // 記錄到控制台和日誌系統
    logger.error('Error reported:', {
      processedError,
      originalError: error.message,
      stack: error.stack,
      context
    });

    // 顯示用戶提示
    if (shouldShowToast && errorHandler.shouldShowToUser(processedError)) {
      showToast(processedError.message, 'error');
    }

    // 自動重試邏輯
    if (autoRetry && errorHandler.shouldAutoRetry(processedError)) {
      const retryDelay = processedError.retryDelay || 3000;
      
      setTimeout(() => {
        logger.info(`Auto-retrying after ${retryDelay}ms...`);
        // 這裡可以觸發重試邏輯
      }, retryDelay);
    }

    return processedError;
  }, [showToast]);

  // 創建一個帶上下文的錯誤處理器
  const createContextualErrorHandler = useCallback((
    context: ErrorContext,
    options?: ErrorReportOptions
  ) => {
    return (error: Error) => reportError(error, { ...options, context });
  }, [reportError]);

  // 全局錯誤監聽器
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = new Error(
        event.reason?.message || 
        event.reason?.toString() || 
        'Unhandled Promise Rejection'
      );
      
      reportError(error, {
        context: {
          component: 'Global',
          action: 'unhandledRejection'
        }
      });

      // 防止瀏覽器默認行為
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      reportError(event.error || new Error(event.message), {
        context: {
          component: 'Global',
          action: 'windowError',
          additionalData: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        }
      });

      // 防止瀏覽器默認行為
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [reportError]);

  return {
    reportError,
    createContextualErrorHandler
  };
};

// 錯誤報告裝飾器 - 用於包裝異步函數
export const withErrorReporting = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: ErrorContext
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const processedError = errorHandler.processError(error as Error, context);
      
      if (processedError.isRetryable) {
        logger.info('Retryable error occurred, considering retry...');
      }
      
      throw error;
    }
  }) as T;
};