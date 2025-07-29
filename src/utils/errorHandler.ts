// src/utils/errorHandler.ts
// 全局錯誤處理系統 - 智能錯誤分類和用戶友好提示

import { logger } from './logger';

export interface ErrorContext {
  component?: string;
  action?: string;
  txHash?: string;
  userAddress?: string;
  contractAddress?: string;
  additionalData?: Record<string, any>;
}

export interface ProcessedError {
  type: ErrorType;
  title: string;
  message: string;
  action?: ErrorAction;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRetryable: boolean;
  retryDelay?: number;
}

export type ErrorType = 
  | 'network'
  | 'rpc_timeout' 
  | 'contract_revert'
  | 'insufficient_gas'
  | 'user_rejected'
  | 'unauthorized'
  | 'rate_limit'
  | 'validation'
  | 'unknown';

export interface ErrorAction {
  type: 'retry' | 'authorize' | 'adjust_gas' | 'wait' | 'navigate' | 'contact_support';
  label: string;
  handler?: () => void | Promise<void>;
}

class ErrorHandler {
  private errorPatterns: Array<{
    pattern: RegExp | string;
    type: ErrorType;
    extractInfo?: (error: Error, match?: RegExpMatchArray) => Partial<ProcessedError>;
  }> = [
    // Network & RPC errors
    {
      pattern: /network error|fetch.*failed|connection.*refused/i,
      type: 'network',
      extractInfo: () => ({
        title: '網路連線問題',
        message: '無法連線到區塊鏈網路，請檢查網路連線',
        isRetryable: true,
        retryDelay: 3000,
        severity: 'medium'
      })
    },
    {
      pattern: /timeout|timed out/i,
      type: 'rpc_timeout',
      extractInfo: () => ({
        title: 'RPC 請求超時',
        message: '區塊鏈節點響應緩慢，正在重試...',
        isRetryable: true,
        retryDelay: 5000,
        severity: 'medium'
      })
    },
    
    // Contract errors
    {
      pattern: /execution reverted|revert/i,
      type: 'contract_revert',
      extractInfo: (error) => {
        const message = error.message;
        
        // 解析具體的 revert 原因
        if (message.includes('insufficient funds')) {
          return {
            title: '餘額不足',
            message: '您的錢包餘額不足以完成此交易',
            severity: 'high',
            isRetryable: false
          };
        }
        
        if (message.includes('not authorized') || message.includes('Ownable')) {
          return {
            title: '權限不足',
            message: '您沒有執行此操作的權限',
            severity: 'medium',
            isRetryable: false
          };
        }
        
        if (message.includes('cooldown') || message.includes('too early')) {
          return {
            title: '操作過於頻繁',
            message: '請等待冷卻時間結束後再試',
            severity: 'low',
            isRetryable: true,
            retryDelay: 60000
          };
        }
        
        return {
          title: '合約執行失敗',
          message: '智能合約執行被拒絕，請檢查操作參數',
          severity: 'medium',
          isRetryable: false
        };
      }
    },
    
    // Gas errors
    {
      pattern: /gas.*insufficient|out of gas|gas.*too low/i,
      type: 'insufficient_gas',
      extractInfo: () => ({
        title: 'Gas 費用不足',
        message: '交易所需的 Gas 費用不足，請調整 Gas 設定',
        severity: 'medium',
        isRetryable: true,
        action: {
          type: 'adjust_gas',
          label: '調整 Gas 設定'
        }
      })
    },
    
    // User interaction errors
    {
      pattern: /user rejected|user denied|cancelled by user/i,
      type: 'user_rejected',
      extractInfo: () => ({
        title: '用戶取消操作',
        message: '您已取消此次交易',
        severity: 'low',
        isRetryable: true
      })
    },
    
    // Authorization errors
    {
      pattern: /not approved|approval required|allowance/i,
      type: 'unauthorized',
      extractInfo: () => ({
        title: '需要授權',
        message: '此操作需要先授權合約使用您的代幣',
        severity: 'medium',
        isRetryable: true,
        action: {
          type: 'authorize',
          label: '授權合約'
        }
      })
    },
    
    // Rate limiting
    {
      pattern: /429|rate limit|too many requests/i,
      type: 'rate_limit',
      extractInfo: () => ({
        title: '請求過於頻繁',
        message: '請求次數超出限制，請稍後再試',
        severity: 'low',
        isRetryable: true,
        retryDelay: 10000,
        action: {
          type: 'wait',
          label: '等待重試'
        }
      })
    },
    
    // Validation errors
    {
      pattern: /invalid.*parameter|invalid.*input|validation.*failed/i,
      type: 'validation',
      extractInfo: () => ({
        title: '參數錯誤',
        message: '輸入的參數不正確，請檢查後重試',
        severity: 'medium',
        isRetryable: false
      })
    }
  ];

  processError(error: Error, context?: ErrorContext): ProcessedError {
    const errorMessage = error.message || error.toString();
    
    // 記錄原始錯誤
    logger.error('Processing error:', {
      error: errorMessage,
      stack: error.stack,
      context
    });

    // 嘗試匹配錯誤模式
    for (const { pattern, type, extractInfo } of this.errorPatterns) {
      let match: RegExpMatchArray | null = null;
      let isMatch = false;

      if (pattern instanceof RegExp) {
        match = errorMessage.match(pattern);
        isMatch = match !== null;
      } else {
        isMatch = errorMessage.toLowerCase().includes(pattern.toLowerCase());
      }

      if (isMatch) {
        const baseInfo = extractInfo ? extractInfo(error, match || undefined) : {};
        return {
          type,
          title: baseInfo.title || this.getDefaultTitle(type),
          message: baseInfo.message || this.getDefaultMessage(type),
          action: baseInfo.action,
          severity: baseInfo.severity || 'medium',
          isRetryable: baseInfo.isRetryable ?? true,
          retryDelay: baseInfo.retryDelay
        };
      }
    }

    // 未匹配到特定模式的通用處理
    return {
      type: 'unknown',
      title: '未知錯誤',
      message: '發生了未預期的錯誤，請稍後重試',
      severity: 'medium',
      isRetryable: true,
      action: {
        type: 'contact_support',
        label: '聯絡支援'
      }
    };
  }

  private getDefaultTitle(type: ErrorType): string {
    const titles: Record<ErrorType, string> = {
      network: '網路錯誤',
      rpc_timeout: '連線超時',
      contract_revert: '合約錯誤',
      insufficient_gas: 'Gas 不足',
      user_rejected: '用戶取消',
      unauthorized: '未授權',
      rate_limit: '請求限制',
      validation: '參數錯誤',
      unknown: '未知錯誤'
    };
    return titles[type];
  }

  private getDefaultMessage(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      network: '網路連線出現問題，請檢查網路狀態',
      rpc_timeout: '區塊鏈節點響應超時，請稍後重試',
      contract_revert: '智能合約執行失敗',
      insufficient_gas: 'Gas 費用不足，請調整設定',
      user_rejected: '操作已被用戶取消',
      unauthorized: '需要授權才能執行此操作',
      rate_limit: '請求過於頻繁，請稍後再試',
      validation: '輸入參數不正確',
      unknown: '發生未預期的錯誤'
    };
    return messages[type];
  }

  // 創建帶有上下文的錯誤處理器
  createContextualHandler(context: ErrorContext) {
    return (error: Error) => this.processError(error, context);
  }

  // 判斷錯誤是否應該向用戶顯示
  shouldShowToUser(processedError: ProcessedError): boolean {
    // 低嚴重度的已知錯誤可能不需要顯示
    if (processedError.severity === 'low' && processedError.type === 'user_rejected') {
      return false;
    }
    return true;
  }

  // 判斷錯誤是否應該自動重試
  shouldAutoRetry(processedError: ProcessedError): boolean {
    return processedError.isRetryable && 
           ['network', 'rpc_timeout', 'rate_limit'].includes(processedError.type);
  }
}

// 導出單例
export const errorHandler = new ErrorHandler();

// 便捷函數
export const processError = (error: Error, context?: ErrorContext) => 
  errorHandler.processError(error, context);

export const createErrorHandler = (context: ErrorContext) => 
  errorHandler.createContextualHandler(context);