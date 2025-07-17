// src/utils/errorCodeTracker.ts - 錯誤代碼 5 追蹤器

export class ErrorCodeTracker {
  private static instance: ErrorCodeTracker;
  private errorCode5Count = 0;
  private lastError5: any = null;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new ErrorCodeTracker();
    }
    return this.instance;
  }
  
  constructor() {
    this.setupGlobalErrorHandlers();
  }
  
  private setupGlobalErrorHandlers() {
    // 暫時禁用全局錯誤處理以避免性能問題
    console.log('錯誤追蹤已禁用');
  }
  
  private analyzeError5(error: any) {
    console.group('🔍 錯誤代碼 5 分析');
    
    // 檢查是否是 DOM 異常
    if (error?.name === 'InvalidCharacterError' && error?.code === 5) {
      console.error('DOM 異常: InvalidCharacterError (代碼 5)');
      console.error('可能原因: 無效的字符在 DOM 操作中（如 setAttribute、className 等）');
    }
    
    // 檢查是否是 IndexedDB 錯誤
    if (error?.name === 'DataError' && error?.code === 5) {
      console.error('IndexedDB 異常: DataError (代碼 5)');
      console.error('可能原因: IndexedDB 操作失敗');
    }
    
    // 檢查是否是網路錯誤
    if (error?.name === 'NetworkError' && error?.code === 5) {
      console.error('網路異常: NetworkError (代碼 5)');
      console.error('可能原因: 跨域請求失敗或網路連接問題');
    }
    
    // 檢查堆疊追蹤
    if (error?.stack) {
      const stackLines = error.stack.split('\n');
      console.log('堆疊追蹤:');
      stackLines.slice(0, 5).forEach((line: string) => console.log(line));
      
      // 分析可能的問題來源
      if (error.stack.includes('localStorage')) {
        console.error('💡 可能與 localStorage 操作有關');
      }
      if (error.stack.includes('fetch') || error.stack.includes('XMLHttpRequest')) {
        console.error('💡 可能與網路請求有關');
      }
      if (error.stack.includes('wagmi') || error.stack.includes('viem')) {
        console.error('💡 可能與 Web3 操作有關');
      }
    }
    
    console.groupEnd();
  }
  
  getReport() {
    return {
      errorCode5Count: this.errorCode5Count,
      lastError5: this.lastError5
    };
  }
}

// 自動初始化
export const errorCodeTracker = ErrorCodeTracker.getInstance();