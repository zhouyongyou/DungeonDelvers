// src/utils/diagnostics.ts - 頁面診斷工具

export class PageDiagnostics {
  private startTime: number;
  private errors: Array<{time: number, error: any, source: string}> = [];
  private rpcCalls: Array<{time: number, method: string, duration?: number}> = [];
  private performanceMarks: Map<string, number> = new Map();
  
  constructor() {
    this.startTime = performance.now();
    this.setupErrorHandlers();
    this.monitorRpcCalls();
  }
  
  private setupErrorHandlers() {
    // 捕獲全局錯誤
    window.addEventListener('error', (event) => {
      this.errors.push({
        time: performance.now() - this.startTime,
        error: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        },
        source: 'window.error'
      });
      
      // 特別檢查錯誤代碼 5
      if (event.message?.includes('5') || event.error?.code === 5) {
        console.error('🚨 錯誤代碼 5 檢測到:', event);
      }
    });
    
    // 捕獲未處理的 Promise 拒絕
    window.addEventListener('unhandledrejection', (event) => {
      this.errors.push({
        time: performance.now() - this.startTime,
        error: {
          reason: event.reason,
          promise: event.promise
        },
        source: 'unhandledrejection'
      });
    });
  }
  
  private monitorRpcCalls() {
    // 暫時禁用 fetch 攔截以避免性能問題
    console.log('RPC 監控已禁用');
  }
  
  mark(name: string) {
    this.performanceMarks.set(name, performance.now() - this.startTime);
  }
  
  generateReport() {
    const report = {
      總耗時: `${(performance.now() - this.startTime).toFixed(0)}ms`,
      錯誤數量: this.errors.length,
      RPC請求數: this.rpcCalls.length,
      平均RPC耗時: this.rpcCalls.length > 0 
        ? `${(this.rpcCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / this.rpcCalls.length).toFixed(0)}ms`
        : 'N/A',
      慢速RPC請求: this.rpcCalls.filter(call => (call.duration || 0) > 1000).length,
      錯誤詳情: this.errors,
      性能標記: Object.fromEntries(this.performanceMarks),
      記憶體使用: (performance as any).memory ? {
        使用量: `${((performance as any).memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        限制: `${((performance as any).memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
      } : '不支援'
    };
    
    console.log('📊 診斷報告:', report);
    return report;
  }
  
  // 檢查常見問題
  checkCommonIssues() {
    const issues = [];
    
    // 檢查 localStorage 大小
    try {
      const localStorageSize = new Blob(Object.values(localStorage)).size;
      if (localStorageSize > 5 * 1024 * 1024) { // 5MB
        issues.push(`localStorage 過大: ${(localStorageSize / 1024 / 1024).toFixed(2)}MB`);
      }
    } catch (e) {
      issues.push('無法檢查 localStorage 大小');
    }
    
    // 檢查 RPC 請求過多
    if (this.rpcCalls.length > 50) {
      issues.push(`RPC 請求過多: ${this.rpcCalls.length} 次`);
    }
    
    // 檢查錯誤
    if (this.errors.length > 0) {
      issues.push(`發生 ${this.errors.length} 個錯誤`);
    }
    
    return issues;
  }
}

// 全局診斷實例
export const diagnostics = new PageDiagnostics();