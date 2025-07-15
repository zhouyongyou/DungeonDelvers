// src/config/sentry.ts - Sentry 錯誤監控配置

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * 初始化 Sentry 錯誤監控
 * 
 * 使用步驟：
 * 1. 安裝依賴：npm install @sentry/react @sentry/tracing
 * 2. 在 Sentry.io 創建專案，獲取 DSN
 * 3. 在 .env 添加：VITE_SENTRY_DSN=your_dsn_here
 * 4. 在 main.tsx 中調用 initSentry()
 */
export function initSentry() {
  // 只在生產環境啟用
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          // 錄製用戶操作，幫助重現錯誤
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true,
        }),
      ],
      
      // 性能監控採樣率
      tracesSampleRate: 0.1, // 10% 的交易會被追蹤
      
      // Session Replay 採樣率
      replaysSessionSampleRate: 0.1, // 10% 的 session 會被錄製
      replaysOnErrorSampleRate: 1.0, // 發生錯誤時 100% 錄製
      
      // 環境標籤
      environment: import.meta.env.MODE,
      
      // 過濾掉一些不重要的錯誤
      ignoreErrors: [
        // 瀏覽器擴展錯誤
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',
        // 錢包相關錯誤
        'User rejected the request',
        'User denied transaction signature',
      ],
      
      // 在發送錯誤前處理
      beforeSend(event, hint) {
        // 過濾掉開發環境的錯誤
        if (window.location.hostname === 'localhost') {
          return null;
        }
        
        // 添加用戶上下文（如果有）
        const address = localStorage.getItem('walletAddress');
        if (address) {
          event.user = {
            id: address,
            username: address.slice(0, 6) + '...' + address.slice(-4),
          };
        }
        
        // 添加自定義標籤
        event.tags = {
          ...event.tags,
          chainId: localStorage.getItem('chainId') || 'unknown',
        };
        
        return event;
      },
    });
  }
}

/**
 * 手動捕獲錯誤
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    });
  }
}

/**
 * 記錄麵包屑（用戶行為軌跡）
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      message,
      level: 'info',
      data,
      timestamp: Date.now() / 1000,
    });
  }
}

/**
 * 性能監控
 */
export function measureTransaction(name: string, fn: () => Promise<any>) {
  if (import.meta.env.PROD) {
    const transaction = Sentry.startTransaction({ name });
    Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));
    
    return fn()
      .then(result => {
        transaction.setStatus('ok');
        return result;
      })
      .catch(error => {
        transaction.setStatus('internal_error');
        throw error;
      })
      .finally(() => {
        transaction.finish();
      });
  }
  
  return fn();
}