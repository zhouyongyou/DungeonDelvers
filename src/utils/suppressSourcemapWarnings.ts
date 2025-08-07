// 抑制 WalletConnect sourcemap 警告和 Coinbase 分析錯誤
// 這些警告不影響功能

if (import.meta.env.DEV) {
  // 抑制 sourcemap 警告
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && message.includes('Sourcemap for')) {
      // 忽略 sourcemap 警告
      return;
    }
    originalWarn.apply(console, args);
  };
  
  // 抑制 Coinbase 分析錯誤
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && 
        (message.includes('cca-lite.coinbase.com') || 
         message.includes('ERR_BLOCKED_BY_CLIENT') ||
         message.includes('401 (Unauthorized)'))) {
      // 忽略 Coinbase 分析錯誤
      return;
    }
    originalError.apply(console, args);
  };
}

export {};