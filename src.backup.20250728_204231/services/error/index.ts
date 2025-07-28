// 統一錯誤處理服務 - 整合所有錯誤處理邏輯
// 避免重複的錯誤處理、日誌記錄、用戶提示邏輯

import { toast } from 'react-toastify';
import React from 'react';
import { logger } from '../../utils/logger';
import { APP_CONSTANTS } from '../../config/constants';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'contract' | 'wallet' | 'validation' | 'unknown';

export interface ErrorContext {
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  userMessage?: string;
  technicalDetails?: any;
  shouldNotify?: boolean;
  shouldLog?: boolean;
}

export class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler;
  private errorStats: Map<string, number> = new Map();
  
  private constructor() {
    this.setupGlobalHandlers();
  }
  
  static getInstance(): UnifiedErrorHandler {
    if (!UnifiedErrorHandler.instance) {
      UnifiedErrorHandler.instance = new UnifiedErrorHandler();
    }
    return UnifiedErrorHandler.instance;
  }
  
  // =================================================================
  // 主要 API
  // =================================================================
  
  handle(error: any, context: ErrorContext = {}): void {
    const {
      severity = 'medium',
      category = 'unknown',
      userMessage,
      technicalDetails,
      shouldNotify = true,
      shouldLog = true,
    } = context;
    
    // 標準化錯誤
    const standardError = this.standardizeError(error);
    
    // 記錄統計
    this.recordErrorStats(standardError.type);
    
    // 日誌記錄
    if (shouldLog) {
      this.logError(standardError, severity, category, technicalDetails);
    }
    
    // 用戶通知
    if (shouldNotify) {
      this.notifyUser(userMessage || standardError.userMessage, severity);
    }
    
    // 特殊處理
    this.handleSpecialCases(standardError, category);
  }
  
  // =================================================================
  // 錯誤分類
  // =================================================================
  
  categorizeError(error: any): ErrorCategory {
    const message = error?.message || error?.toString() || '';
    
    // 網路錯誤
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('NETWORK_ERROR') ||
      message.includes('429') ||
      message.includes('503')
    ) {
      return 'network';
    }
    
    // 合約錯誤
    if (
      message.includes('revert') ||
      message.includes('contract') ||
      message.includes('execution reverted') ||
      message.includes('gas')
    ) {
      return 'contract';
    }
    
    // 錢包錯誤
    if (
      message.includes('wallet') ||
      message.includes('user rejected') ||
      message.includes('insufficient funds') ||
      message.includes('account')
    ) {
      return 'wallet';
    }
    
    // 驗證錯誤
    if (
      message.includes('invalid') ||
      message.includes('validation') ||
      message.includes('required')
    ) {
      return 'validation';
    }
    
    return 'unknown';
  }
  
  // =================================================================
  // 錯誤標準化
  // =================================================================
  
  private standardizeError(error: any) {
    // 處理不同類型的錯誤
    if (error?.response) {
      // HTTP 錯誤
      return {
        type: `HTTP_${error.response.status}`,
        message: error.response.data?.message || error.message,
        userMessage: this.getHttpErrorMessage(error.response.status),
        details: error.response.data,
      };
    }
    
    if (error?.code) {
      // 以太坊錯誤
      return {
        type: `ETH_${error.code}`,
        message: error.message,
        userMessage: this.getEthereumErrorMessage(error.code),
        details: error.data,
      };
    }
    
    // 一般錯誤
    return {
      type: 'GENERAL_ERROR',
      message: error?.message || String(error),
      userMessage: APP_CONSTANTS.ERROR_MESSAGES.NETWORK_ERROR,
      details: error,
    };
  }
  
  // =================================================================
  // 用戶友好的錯誤訊息
  // =================================================================
  
  private getHttpErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      400: '請求格式錯誤',
      401: '請先連接錢包',
      403: '權限不足',
      404: '資源不存在',
      429: '請求過於頻繁，請稍後再試',
      500: '伺服器錯誤，請稍後再試',
      503: '服務暫時不可用',
    };
    
    return messages[status] || APP_CONSTANTS.ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  private getEthereumErrorMessage(code: number | string): string {
    const messages: Record<string, string> = {
      '4001': '交易已取消',
      '4100': '未授權的錢包操作',
      '4200': '不支援的操作',
      '4900': '錢包已斷開連接',
      '4901': '請先連接錢包',
      '-32700': '無效的請求',
      '-32600': '無效的請求',
      '-32601': '方法不存在',
      '-32602': '無效的參數',
      '-32603': '內部錯誤',
      '-32000': '交易失敗',
      '-32003': '交易被拒絕',
    };
    
    return messages[String(code)] || APP_CONSTANTS.ERROR_MESSAGES.CONTRACT_ERROR;
  }
  
  // =================================================================
  // 日誌記錄
  // =================================================================
  
  private logError(
    error: any,
    severity: ErrorSeverity,
    category: ErrorCategory,
    details?: any
  ) {
    const logData = {
      timestamp: new Date().toISOString(),
      severity,
      category,
      error: {
        type: error.type,
        message: error.message,
        details: error.details,
      },
      additionalDetails: details,
    };
    
    switch (severity) {
      case 'critical':
        logger.error('[CRITICAL ERROR]', logData);
        break;
      case 'high':
        logger.error('[ERROR]', logData);
        break;
      case 'medium':
        logger.warn('[WARNING]', logData);
        break;
      case 'low':
        logger.info('[INFO]', logData);
        break;
    }
  }
  
  // =================================================================
  // 用戶通知
  // =================================================================
  
  private notifyUser(message: string, severity: ErrorSeverity) {
    // 使用 toast 通知
    switch (severity) {
      case 'critical':
      case 'high':
        toast.error(message);
        break;
      case 'medium':
        toast.warning(message);
        break;
      case 'low':
        toast.info(message);
        break;
    }
  }
  
  // =================================================================
  // 特殊處理
  // =================================================================
  
  private handleSpecialCases(error: any, category: ErrorCategory) {
    switch (category) {
      case 'wallet':
        // 錢包錯誤可能需要重新連接
        if (error.type === 'ETH_4901' || error.type === 'ETH_4900') {
          // 觸發錢包重連邏輯
          window.dispatchEvent(new CustomEvent('wallet:reconnect'));
        }
        break;
        
      case 'network':
        // 網路錯誤可能需要切換 RPC
        if (error.type === 'HTTP_429' || error.type === 'HTTP_503') {
          // 觸發 RPC 切換邏輯
          window.dispatchEvent(new CustomEvent('rpc:switch'));
        }
        break;
        
      case 'contract':
        // 合約錯誤可能需要刷新數據
        if (error.message?.includes('stale')) {
          // 觸發數據刷新
          window.dispatchEvent(new CustomEvent('data:refresh'));
        }
        break;
    }
  }
  
  // =================================================================
  // 全局錯誤處理
  // =================================================================
  
  private setupGlobalHandlers() {
    if (typeof window === 'undefined') return;
    
    // 處理未捕獲的錯誤
    window.addEventListener('error', (event) => {
      this.handle(event.error, {
        severity: 'high',
        category: 'unknown',
        userMessage: '發生未預期的錯誤',
      });
    });
    
    // 處理未捕獲的 Promise 拒絕
    window.addEventListener('unhandledrejection', (event) => {
      this.handle(event.reason, {
        severity: 'high',
        category: this.categorizeError(event.reason),
        userMessage: '操作失敗，請重試',
      });
    });
  }
  
  // =================================================================
  // 統計和監控
  // =================================================================
  
  private recordErrorStats(errorType: string) {
    const count = this.errorStats.get(errorType) || 0;
    this.errorStats.set(errorType, count + 1);
  }
  
  getStats() {
    const stats: Record<string, any> = {
      total: 0,
      byType: {},
      topErrors: [],
    };
    
    // 計算總數和分類
    this.errorStats.forEach((count, type) => {
      stats.total += count;
      stats.byType[type] = count;
    });
    
    // 找出最常見的錯誤
    stats.topErrors = Array.from(this.errorStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
    
    return stats;
  }
  
  resetStats() {
    this.errorStats.clear();
  }
}

// 導出單例
export const errorHandler = UnifiedErrorHandler.getInstance();

// 導出便捷方法
export const handleError = (error: any, context?: ErrorContext) => {
  errorHandler.handle(error, context);
};

// React 錯誤邊界組件
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorHandler.handle(error, {
      severity: 'high',
      category: 'unknown',
      technicalDetails: errorInfo,
      userMessage: '頁面發生錯誤，請重新整理',
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <h2 className="text-xl font-bold mb-4">發生錯誤</h2>
            <p className="text-gray-600 mb-4">頁面載入失敗，請重新整理頁面</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重新整理
            </button>
          </div>
        )
      );
    }
    
    return this.props.children;
  }
}