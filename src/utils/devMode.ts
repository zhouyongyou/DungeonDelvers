// 開發模式檢測和降級處理
export const isDevelopment = import.meta.env.DEV;
export const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// 檢查是否為本地開發環境
export const isLocalDev = isDevelopment && isLocalhost;

// RPC 降級處理
export function shouldUseRpcFallback(): boolean {
  return isLocalDev;
}

// 創建開發友好的錯誤信息
export function createDevFriendlyError(originalError: any, context: string): Error {
  if (isLocalDev) {
    return new Error(`[本地開發] ${context}: 功能在生產環境中正常工作。原始錯誤: ${originalError.message}`);
  }
  return originalError;
}