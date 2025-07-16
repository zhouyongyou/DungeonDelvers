// src/utils/adminErrorHandler.ts - 管理員頁面錯誤處理和回退機制

import { logger } from './logger';
// import { rpcMonitor } from './rpcMonitor'; // Removed RPC monitoring

// 錯誤類型枚舉
export enum AdminErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// 錯誤詳情接口
export interface AdminError {
  type: AdminErrorType;
  message: string;
  details?: any;
  timestamp: number;
  context?: {
    component?: string;
    action?: string;
    contractName?: string;
    functionName?: string;
  };
}

// 回退數據接口
export interface FallbackData {
  isLoading: boolean;
  error: AdminError | null;
  data: any;
  retry: () => void;
  reset: () => void;
}

// 錯誤分類器
class ErrorClassifier {
  classify(error: any): AdminErrorType {
    if (!error) return AdminErrorType.UNKNOWN_ERROR;

    const errorMessage = error.message || error.toString();
    const lowerMessage = errorMessage.toLowerCase();

    // 網絡錯誤
    if (lowerMessage.includes('network') || 
        lowerMessage.includes('timeout') || 
        lowerMessage.includes('connection')) {
      return AdminErrorType.NETWORK_ERROR;
    }

    // 合約錯誤
    if (lowerMessage.includes('revert') || 
        lowerMessage.includes('transaction') || 
        lowerMessage.includes('gas')) {
      return AdminErrorType.CONTRACT_ERROR;
    }

    // 驗證錯誤
    if (lowerMessage.includes('invalid') || 
        lowerMessage.includes('validation') || 
        lowerMessage.includes('address')) {
      return AdminErrorType.VALIDATION_ERROR;
    }

    // 超時錯誤
    if (lowerMessage.includes('timeout') || 
        lowerMessage.includes('timed out')) {
      return AdminErrorType.TIMEOUT_ERROR;
    }

    return AdminErrorType.UNKNOWN_ERROR;
  }

  getErrorMessage(type: AdminErrorType): string {
    switch (type) {
      case AdminErrorType.NETWORK_ERROR:
        return '網絡連接失敗，請檢查網絡狀態';
      case AdminErrorType.CONTRACT_ERROR:
        return '合約調用失敗，請檢查參數或權限';
      case AdminErrorType.VALIDATION_ERROR:
        return '輸入驗證失敗，請檢查輸入格式';
      case AdminErrorType.TIMEOUT_ERROR:
        return '請求超時，請稍後重試';
      case AdminErrorType.UNKNOWN_ERROR:
      default:
        return '未知錯誤，請稍後重試';
    }
  }

  getSuggestion(type: AdminErrorType): string {
    switch (type) {
      case AdminErrorType.NETWORK_ERROR:
        return '1. 檢查網絡連接\n2. 嘗試刷新頁面\n3. 切換到不同的 RPC 節點';
      case AdminErrorType.CONTRACT_ERROR:
        return '1. 檢查合約地址是否正確\n2. 確認擁有足夠的權限\n3. 檢查 gas 費用設置';
      case AdminErrorType.VALIDATION_ERROR:
        return '1. 檢查輸入格式\n2. 確認地址格式正確\n3. 檢查數值範圍';
      case AdminErrorType.TIMEOUT_ERROR:
        return '1. 稍後重試\n2. 檢查網絡穩定性\n3. 考慮分批處理';
      case AdminErrorType.UNKNOWN_ERROR:
      default:
        return '1. 刷新頁面重試\n2. 檢查瀏覽器控制台\n3. 聯繫技術支持';
    }
  }
}

// 重試管理器
class RetryManager {
  private retryCount = new Map<string, number>();
  private maxRetries = 3;
  private retryDelay = 1000;

  async executeWithRetry<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      onRetry?: (attemptNumber: number, error: any) => void;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries || this.maxRetries;
    const retryDelay = options.retryDelay || this.retryDelay;
    
    let lastError: any;
    let currentRetry = this.retryCount.get(key) || 0;

    while (currentRetry <= maxRetries) {
      try {
        const result = await operation();
        this.retryCount.delete(key); // 成功後清除重試計數
        return result;
      } catch (error) {
        lastError = error;
        currentRetry++;
        this.retryCount.set(key, currentRetry);

        if (currentRetry <= maxRetries) {
          logger.warn(`重試 ${key} (${currentRetry}/${maxRetries}):`, error);
          options.onRetry?.(currentRetry, error);
          
          // 指數退避
          await new Promise(resolve => 
            setTimeout(resolve, retryDelay * Math.pow(2, currentRetry - 1))
          );
        }
      }
    }

    this.retryCount.delete(key);
    throw lastError;
  }

  getRetryCount(key: string): number {
    return this.retryCount.get(key) || 0;
  }

  clearRetries(key?: string): void {
    if (key) {
      this.retryCount.delete(key);
    } else {
      this.retryCount.clear();
    }
  }
}

// 回退數據管理器
class FallbackDataManager {
  private fallbackCache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5分鐘

  setFallbackData(key: string, data: any): void {
    this.fallbackCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  getFallbackData(key: string): any | null {
    const cached = this.fallbackCache.get(key);
    if (!cached) return null;

    // 檢查是否過期
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.fallbackCache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearFallbackData(key?: string): void {
    if (key) {
      this.fallbackCache.delete(key);
    } else {
      this.fallbackCache.clear();
    }
  }

  // 定期清理過期數據
  startCleanup(): void {
    // TEMP_DISABLED: 暫時禁用定期清理以避免 RPC 過載
    /*
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.fallbackCache.entries()) {
        if (now - cached.timestamp > this.cacheTimeout) {
          this.fallbackCache.delete(key);
        }
      }
    }, 60000); // 每分鐘清理一次
    */
  }
}

// 超時管理器
class TimeoutManager {
  private timeouts = new Map<string, NodeJS.Timeout>();
  private defaultTimeout = 30000; // 30秒

  createTimeout(
    key: string,
    callback: () => void,
    timeout: number = this.defaultTimeout
  ): void {
    this.clearTimeout(key);
    
    const timeoutId = setTimeout(() => {
      callback();
      this.timeouts.delete(key);
    }, timeout);

    this.timeouts.set(key, timeoutId);
  }

  clearTimeout(key: string): void {
    const timeoutId = this.timeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(key);
    }
  }

  clearAllTimeouts(): void {
    for (const [key, timeoutId] of this.timeouts.entries()) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();
  }
}

// 管理員錯誤處理器主類
export class AdminErrorHandler {
  private errorClassifier = new ErrorClassifier();
  private retryManager = new RetryManager();
  private fallbackDataManager = new FallbackDataManager();
  private timeoutManager = new TimeoutManager();
  private errorHistory: AdminError[] = [];

  constructor() {
    this.fallbackDataManager.startCleanup();
  }

  // 處理錯誤
  handleError(
    error: any,
    context?: {
      component?: string;
      action?: string;
      contractName?: string;
      functionName?: string;
    }
  ): AdminError {
    const errorType = this.errorClassifier.classify(error);
    const adminError: AdminError = {
      type: errorType,
      message: this.errorClassifier.getErrorMessage(errorType),
      details: error,
      timestamp: Date.now(),
      context,
    };

    // 記錄到歷史
    this.errorHistory.push(adminError);
    
    // 保持歷史記錄在合理範圍內
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }

    // RPC monitoring disabled
    // rpcMonitor.completeRequest(
    //   `error_${Date.now()}`,
    //   undefined,
    //   `${errorType}: ${adminError.message}`
    // );

    logger.error('管理員錯誤:', adminError);
    
    return adminError;
  }

  // 執行帶重試的操作
  async executeWithRetry<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      timeout?: number;
      onRetry?: (attemptNumber: number, error: any) => void;
      onTimeout?: () => void;
    } = {}
  ): Promise<T> {
    // 設置超時
    if (options.timeout) {
      this.timeoutManager.createTimeout(
        key,
        () => {
          options.onTimeout?.();
          throw new Error('操作超時');
        },
        options.timeout
      );
    }

    try {
      const result = await this.retryManager.executeWithRetry(key, operation, options);
      this.timeoutManager.clearTimeout(key);
      return result;
    } catch (error) {
      this.timeoutManager.clearTimeout(key);
      throw error;
    }
  }

  // 創建回退數據
  createFallbackData<T>(
    key: string,
    operation: () => Promise<T>,
    fallbackValue: T,
    options: {
      timeout?: number;
      maxRetries?: number;
      enableFallback?: boolean;
    } = {}
  ): FallbackData {
    const fallbackData: FallbackData = {
      isLoading: true,
      error: null,
      data: fallbackValue,
      retry: () => this.executeFallbackOperation(key, operation, fallbackData, options),
      reset: () => this.resetFallbackData(key, fallbackData),
    };

    this.executeFallbackOperation(key, operation, fallbackData, options);
    return fallbackData;
  }

  // 執行回退操作
  private async executeFallbackOperation<T>(
    key: string,
    operation: () => Promise<T>,
    fallbackData: FallbackData,
    options: {
      timeout?: number;
      maxRetries?: number;
      enableFallback?: boolean;
    }
  ): Promise<void> {
    fallbackData.isLoading = true;
    fallbackData.error = null;

    try {
      const result = await this.executeWithRetry(key, operation, {
        maxRetries: options.maxRetries,
        timeout: options.timeout,
        onRetry: (attemptNumber, error) => {
          logger.info(`正在重試 ${key} (${attemptNumber}/${options.maxRetries || 3})`);
        },
        onTimeout: () => {
          logger.warn(`操作超時: ${key}`);
        },
      });

      fallbackData.data = result;
      fallbackData.isLoading = false;
      
      // 緩存成功數據
      this.fallbackDataManager.setFallbackData(key, result);
      
    } catch (error) {
      const adminError = this.handleError(error, { action: key });
      fallbackData.error = adminError;
      fallbackData.isLoading = false;

      // 嘗試使用回退數據
      if (options.enableFallback) {
        const cachedData = this.fallbackDataManager.getFallbackData(key);
        if (cachedData) {
          fallbackData.data = cachedData;
          logger.info(`使用回退數據: ${key}`);
        }
      }
    }
  }

  // 重置回退數據
  private resetFallbackData(key: string, fallbackData: FallbackData): void {
    fallbackData.isLoading = false;
    fallbackData.error = null;
    this.retryManager.clearRetries(key);
    this.fallbackDataManager.clearFallbackData(key);
    this.timeoutManager.clearTimeout(key);
  }

  // 獲取錯誤歷史
  getErrorHistory(): AdminError[] {
    return [...this.errorHistory];
  }

  // 獲取錯誤建議
  getErrorSuggestion(errorType: AdminErrorType): string {
    return this.errorClassifier.getSuggestion(errorType);
  }

  // 清理
  cleanup(): void {
    this.errorHistory = [];
    this.retryManager.clearRetries();
    this.fallbackDataManager.clearFallbackData();
    this.timeoutManager.clearAllTimeouts();
  }
}

// 創建全局實例
export const adminErrorHandler = new AdminErrorHandler();

// 工具函數：安全的合約調用
export async function safeContractCall<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  context?: {
    component?: string;
    action?: string;
    contractName?: string;
    functionName?: string;
  }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    adminErrorHandler.handleError(error, context);
    return fallbackValue;
  }
}

// 工具函數：帶重試的合約調用
export async function contractCallWithRetry<T>(
  key: string,
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    timeout?: number;
    onRetry?: (attemptNumber: number, error: any) => void;
  } = {}
): Promise<T> {
  return adminErrorHandler.executeWithRetry(key, operation, options);
}

// 工具函數：創建錯誤邊界
export function createErrorBoundary<T>(
  operation: () => T,
  fallbackValue: T,
  errorMessage: string = '操作失敗'
): T {
  try {
    return operation();
  } catch (error) {
    logger.error(errorMessage, error);
    return fallbackValue;
  }
}

// 導出類型
export type { FallbackData };