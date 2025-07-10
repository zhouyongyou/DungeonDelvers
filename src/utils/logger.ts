/**
 * 統一的日誌系統
 * 替代散布在代碼中的 console 語句，提供更好的日誌管理和性能優化
 */

import { ENV } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDev = ENV.IS_DEV;
  private logLevel: LogLevel = this.isDev ? 'debug' : 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formattedMessage = `[${timestamp}] [${levelStr}] ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      formattedMessage += ` | Context: ${JSON.stringify(context)}`;
    }
    
    return formattedMessage;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'debug':
      default:
        console.log(formattedMessage);
        break;
    }
  }

  /**
   * 調試信息 - 僅在開發環境中顯示
   */
  debug = (message: string, context?: LogContext): void => {
    this.log('debug', message, context);
  };

  /**
   * 一般信息日誌
   */
  info = (message: string, context?: LogContext): void => {
    this.log('info', message, context);
  };

  /**
   * 警告日誌
   */
  warn = (message: string, context?: LogContext): void => {
    this.log('warn', message, context);
  };

  /**
   * 錯誤日誌
   */
  error = (message: string, error?: Error | unknown, context?: LogContext): void => {
    let logContext = { ...context };
    
    if (error instanceof Error) {
      logContext = {
        ...logContext,
        error: {
          name: error.name,
          message: error.message,
          stack: this.isDev ? error.stack : undefined,
        },
      };
    } else if (error) {
      logContext = {
        ...logContext,
        error: error,
      };
    }

    this.log('error', message, logContext);
  };

  /**
   * 性能測量
   */
  time = (label: string): (() => void) => {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.debug(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
      
      if (duration > 1000) {
        this.warn(`Slow operation detected: ${label}`, { duration: `${duration.toFixed(2)}ms` });
      }
    };
  };

  /**
   * API 請求日誌
   */
  api = {
    request: (method: string, url: string, context?: LogContext) => {
      logger.debug(`API Request: ${method} ${url}`, context);
    },
    
    response: (method: string, url: string, status: number, duration?: number, context?: LogContext) => {
      const logContext = { status, duration: duration ? `${duration}ms` : undefined, ...context };
      
      if (status >= 400) {
        logger.error(`API Error: ${method} ${url}`, undefined, logContext);
      } else if (status >= 300) {
        logger.warn(`API Redirect: ${method} ${url}`, logContext);
      } else {
        logger.info(`API Success: ${method} ${url}`, logContext);
      }
    },
    
    error: (method: string, url: string, error: Error | unknown, context?: LogContext) => {
      logger.error(`API Request Failed: ${method} ${url}`, error, context);
    },
  };

  /**
   * 區塊鏈相關日誌
   */
  blockchain = {
    transaction: (txHash: string, action: string, context?: LogContext) => {
      logger.info(`Transaction: ${action}`, { txHash, ...context });
    },
    
    contract: (contractName: string, method: string, context?: LogContext) => {
      logger.debug(`Contract Call: ${contractName}.${method}`, context);
    },
    
    error: (action: string, error: Error | unknown, context?: LogContext) => {
      logger.error(`Blockchain Error: ${action}`, error, context);
    },
  };

  /**
   * NFT 相關日誌
   */
  nft = {
    metadata: (tokenId: string, contractAddress: string, action: 'cache_hit' | 'cache_miss' | 'fetch_success' | 'fetch_error', context?: LogContext) => {
      const logContext = { tokenId, contractAddress, ...context };
      
      switch (action) {
        case 'cache_hit':
          logger.debug('NFT Metadata Cache Hit', logContext);
          break;
        case 'cache_miss':
          logger.debug('NFT Metadata Cache Miss', logContext);
          break;
        case 'fetch_success':
          logger.info('NFT Metadata Fetched', logContext);
          break;
        case 'fetch_error':
          logger.error('NFT Metadata Fetch Failed', undefined, logContext);
          break;
      }
    },
  };

  /**
   * 設置日誌級別
   */
  setLevel = (level: LogLevel): void => {
    this.logLevel = level;
  };
}

// 創建全局日誌實例
export const logger = new Logger();

// 導出類型
export type { LogLevel, LogContext };
export { Logger };