// 抑制 WalletConnect sourcemap 警告和 Coinbase 分析錯誤
// 這些警告不影響功能

// 儲存原始的 console 方法
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

// 過濾 sourcemap 警告的輔助函數
const isSourcemapWarning = (message: any): boolean => {
  if (typeof message !== 'string') return false;
  
  return (
    // 所有 sourcemap 相關警告
    (message.includes('Sourcemap') && (
      message.includes('points to missing') ||
      message.includes('node_modules') ||
      message.includes('@walletconnect') ||
      message.includes('@coinbase') ||
      message.includes('@metamask') ||
      message.includes('missing source files')
    ))
  );
};

// 過濾第三方服務錯誤
const isThirdPartyError = (message: any): boolean => {
  if (typeof message !== 'string') return false;
  
  return (
    message.includes('cca-lite.coinbase.com') ||
    message.includes('ERR_BLOCKED_BY_CLIENT') ||
    message.includes('401 (Unauthorized)') ||
    message.includes('POST https://cca')
  );
};

// 覆蓋 console.warn
console.warn = (...args) => {
  if (isSourcemapWarning(args[0])) return;
  if (isThirdPartyError(args[0])) return;
  originalWarn.apply(console, args);
};

// 覆蓋 console.error
console.error = (...args) => {
  if (isSourcemapWarning(args[0])) return;
  if (isThirdPartyError(args[0])) return;
  originalError.apply(console, args);
};

// 覆蓋 console.log（某些警告通過 log 輸出）
console.log = (...args) => {
  if (isSourcemapWarning(args[0])) return;
  if (isThirdPartyError(args[0])) return;
  originalLog.apply(console, args);
};

// 開發環境提示（只顯示一次）
if (import.meta.env.DEV) {
  // 延遲顯示，避免被其他訊息淹沒
  setTimeout(() => {
    console.log(
      '%c🔇 Console filters active: Sourcemap warnings and third-party errors suppressed',
      'color: #9C27B0; font-weight: bold; background: #F3E5F5; padding: 4px 8px; border-radius: 4px;'
    );
  }, 1000);
}

export {};