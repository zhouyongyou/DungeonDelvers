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

// 增強的日誌函數，支援生產環境自動優化
export const logger = {
  info: (message: string, data?: unknown) => {
    // 生產環境中，這些日誌會被 Vite 的 terser 自動移除
    if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_PROD_LOGS === 'true') {
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  
  warn: (message: string, data?: unknown) => {
    // 警告在生產環境保留
    console.warn(`[WARN] ${message}`, data || '');
  },
  
  error: (message: string, error?: unknown) => {
    // 錯誤在生產環境保留
    console.error(`[ERROR] ${message}`, error || '');
  },
  
  debug: (message: string, data?: unknown) => {
    // 只在開發環境且明確開啟 DEBUG 模式時顯示
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG === 'true') {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  },
  
  // 性能追蹤
  time: (label: string) => {
    if (import.meta.env.DEV) {
      console.time(`[PERF] ${label}`);
    }
  },
  
  timeEnd: (label: string) => {
    if (import.meta.env.DEV) {
      console.timeEnd(`[PERF] ${label}`);
    }
  },
  
  // 分組日誌
  group: (label: string) => {
    if (import.meta.env.DEV) {
      console.group(`[GROUP] ${label}`);
    }
  },
  
  groupEnd: () => {
    if (import.meta.env.DEV) {
      console.groupEnd();
    }
  },
  
  // 表格顯示
  table: (data: unknown) => {
    if (import.meta.env.DEV) {
      console.table(data);
    }
  },
  
  // RPC 專用日誌（可獨立控制）
  rpc: (message: string, data?: unknown) => {
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_RPC_LOGS === 'true') {
      console.log(`%c[RPC]%c ${message}`, 'color: #10b981; font-weight: bold', 'color: inherit', data || '');
    }
  },

  // RPC 錯誤（始終顯示，但用不同顏色標記）
  rpcError: (message: string, error?: unknown) => {
    if (import.meta.env.DEV) {
      console.error(`%c[RPC ERROR]%c ${message}`, 'color: #ef4444; font-weight: bold', 'color: inherit', error || '');
    }
  },

  // RPC 警告（始終顯示）
  rpcWarn: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.warn(`%c[RPC WARN]%c ${message}`, 'color: #f59e0b; font-weight: bold', 'color: inherit', data || '');
    }
  },

  // 檢查日誌是否啟用
  isEnabled: (level: 'debug' | 'info' | 'warn' | 'error' | 'rpc') => {
    if (level === 'warn' || level === 'error') return true;
    if (level === 'info') return import.meta.env.DEV || import.meta.env.VITE_ENABLE_PROD_LOGS === 'true';
    if (level === 'debug') return import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG === 'true';
    if (level === 'rpc') return import.meta.env.DEV && import.meta.env.VITE_ENABLE_RPC_LOGS === 'true';
    return false;
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