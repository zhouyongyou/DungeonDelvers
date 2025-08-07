// Console filter to clean up known third-party errors
export function setupConsoleFilters() {
  // Note: Main filtering is already done in suppressSourcemapWarnings.ts
  // This function now only handles additional filters

  // Patterns to filter in window errors
  const filterPatterns = [
    'cca-lite.coinbase.com',
    'ERR_BLOCKED_BY_CLIENT',
    '401 (Unauthorized)',
    'Failed to fetch dynamically imported module',
    'ResizeObserver loop completed',
  ];

  // Also filter network errors in window.onerror
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const errorString = String(message);
    
    // Check if this is a filtered error
    if (filterPatterns.some(pattern => errorString.includes(pattern))) {
      return true; // Prevent default error handling
    }
    
    // Call original handler if exists
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    
    return false;
  };

  // Filter unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.toString() || '';
    if (filterPatterns.some(pattern => reason.includes(pattern))) {
      event.preventDefault();
    }
  });
}

// Development-only console helper
export function setupDevConsole() {
  if (import.meta.env.DEV) {
    // Add a clean console helper
    (window as any).clearNoise = () => {
      console.clear();
      console.log('%c🧹 Console cleaned! Filtering Coinbase SDK noise...', 'color: #4CAF50; font-weight: bold');
    };

    console.log(
      '%c💡 Tip: Type clearNoise() to clean console',
      'color: #2196F3; font-style: italic'
    );
  }
}