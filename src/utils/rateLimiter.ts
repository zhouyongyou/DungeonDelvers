// rateLimiter.ts - 處理 API 請求速率限制

import { logger } from './logger';

interface RateLimiterOptions {
  maxRequests: number; // 最大請求數
  windowMs: number; // 時間窗口（毫秒）
  retryAfterMs?: number; // 遇到 429 後的重試延遲
}

export class RateLimiter {
  private requests: number[] = [];
  private readonly options: Required<RateLimiterOptions>;
  private isRateLimited = false;
  private rateLimitResetTime = 0;

  constructor(options: RateLimiterOptions) {
    this.options = {
      retryAfterMs: 60000, // 默認 1 分鐘
      ...options
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 如果當前處於速率限制狀態，等待
    if (this.isRateLimited) {
      const waitTime = Math.max(0, this.rateLimitResetTime - Date.now());
      if (waitTime > 0) {
        logger.warn(`[RateLimiter] 速率限制中，等待 ${Math.ceil(waitTime / 1000)} 秒`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.isRateLimited = false;
    }

    // 清理過期的請求記錄
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.options.windowMs);

    // 檢查是否超過速率限制
    if (this.requests.length >= this.options.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.options.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        logger.warn(`[RateLimiter] 達到速率限制，等待 ${Math.ceil(waitTime / 1000)} 秒`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // 重新清理過期請求
        this.requests = this.requests.filter(time => Date.now() - time < this.options.windowMs);
      }
    }

    // 記錄新請求
    this.requests.push(Date.now());

    try {
      return await fn();
    } catch (error: any) {
      // 處理 429 錯誤
      if (error.status === 429 || error.message?.includes('429')) {
        logger.error('[RateLimiter] 收到 429 錯誤，啟動速率限制');
        this.isRateLimited = true;
        this.rateLimitResetTime = Date.now() + this.options.retryAfterMs;
        
        // 清空請求記錄，重置計數器
        this.requests = [];
        
        throw new Error(`API 速率限制，請稍後重試（${Math.ceil(this.options.retryAfterMs / 1000)} 秒後）`);
      }
      
      throw error;
    }
  }

  // 獲取當前狀態
  getStatus() {
    const now = Date.now();
    const activeRequests = this.requests.filter(time => now - time < this.options.windowMs);
    
    return {
      currentRequests: activeRequests.length,
      maxRequests: this.options.maxRequests,
      isRateLimited: this.isRateLimited,
      resetTime: this.rateLimitResetTime,
      canMakeRequest: !this.isRateLimited && activeRequests.length < this.options.maxRequests
    };
  }

  // 手動重置速率限制器
  reset() {
    this.requests = [];
    this.isRateLimited = false;
    this.rateLimitResetTime = 0;
  }
}

// 創建 The Graph API 的速率限制器
// Studio 版本的限制比較嚴格
export const graphQLRateLimiter = new RateLimiter({
  maxRequests: 10, // 每分鐘最多 10 個請求
  windowMs: 60000, // 1 分鐘
  retryAfterMs: 120000 // 遇到 429 後等待 2 分鐘
});

// NFT API 的速率限制器
export const nftApiRateLimiter = new RateLimiter({
  maxRequests: 20, // 每分鐘最多 20 個請求
  windowMs: 60000, // 1 分鐘
  retryAfterMs: 60000 // 遇到 429 後等待 1 分鐘
});