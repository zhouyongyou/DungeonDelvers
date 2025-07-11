/**
 * 簡化的錯誤處理和日誌系統
 */

// 簡化的錯誤類型
export type AppError = {
  message: string;
  code?: string;
  details?: unknown;
};

// 簡化的錯誤處理
export const handleError = (error: unknown): AppError => {
  console.error('Error:', error);
  
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR'
    };
  }
  
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'STRING_ERROR'
    };
  }
  
  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    details: error
  };
};

// 簡化的日誌函數
export const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data || '');
  },
  
  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data || '');
  },
  
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
  
  debug: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }
};

// 簡化的 API 錯誤處理
export const handleApiError = (error: unknown) => {
  const appError = handleError(error);
  
  // 在開發環境顯示詳細錯誤
  if (import.meta.env.DEV) {
    logger.error('API Error:', appError);
  }
  
  return appError;
};

// 簡化的網路錯誤處理
export const handleNetworkError = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error && 
      typeof error.message === 'string' && error.message.includes('network')) {
    return {
      message: '網路連接失敗，請檢查您的網路連接',
      code: 'NETWORK_ERROR'
    };
  }
  
  return handleError(error);
};