/**
 * 過濾掉不相關的錯誤（如瀏覽器擴充功能引起的錯誤）
 */
export function filterIrrelevantErrors() {
  // 原始的錯誤處理
  const originalConsoleError = console.error;
  
  console.error = function(...args) {
    const errorString = args.join(' ');
    
    // 過濾擴充功能相關錯誤
    const irrelevantPatterns = [
      'data:application/octet-stream',
      'Immersive Translate',
      'chrome-extension://',
      'moz-extension://',
      'content_script.js'
    ];
    
    const isIrrelevant = irrelevantPatterns.some(pattern => 
      errorString.includes(pattern)
    );
    
    if (!isIrrelevant) {
      originalConsoleError.apply(console, args);
    }
  };
}

// 在開發環境啟用
if (import.meta.env.DEV) {
  filterIrrelevantErrors();
}