// 靜默的 fetch 包裝器，減少控制台錯誤噪音
import { logger } from './logger';

interface FetchOptions extends RequestInit {
  silent?: boolean;
  retries?: number;
  retryDelay?: number;
}

export async function silentFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { silent = true, retries = 0, retryDelay = 1000, ...fetchOptions } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      
      // 如果請求成功，返回響應
      if (response.ok) {
        return response;
      }
      
      // 如果不是 404，記錄錯誤
      if (response.status !== 404 && !silent) {
        logger.debug(`Fetch 失敗: ${url} - Status: ${response.status}`);
      }
      
      // 創建錯誤但不拋出（除非是最後一次嘗試）
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      if (attempt === retries) {
        throw lastError;
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // 只在非靜默模式或是最後一次嘗試時記錄錯誤
      if (!silent || attempt === retries) {
        // CORS 錯誤特殊處理 - 只記錄一次
        if (error instanceof TypeError && error.message.includes('CORS')) {
          // 不輸出到 console，只記錄到內部日誌
          logger.debug(`CORS 錯誤 (靜默): ${url}`);
        } else if (attempt === retries) {
          // 最後一次嘗試失敗才記錄
          logger.debug(`Fetch 最終失敗: ${url} - ${lastError.message}`);
        }
      }
      
      if (attempt === retries) {
        throw lastError;
      }
      
      // 等待後重試
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('Fetch failed');
}