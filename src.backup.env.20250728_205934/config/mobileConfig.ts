// 移動端配置中心

export const MOBILE_CONFIG = {
  // 觸控配置
  touch: {
    minTouchTargetSize: 44, // Apple 推薦的最小觸控目標尺寸
    swipeThreshold: 50, // 滑動手勢閾值
    longPressDelay: 500, // 長按延遲
    doubleTapDelay: 300, // 雙擊延遲
  },

  // 斷點配置
  breakpoints: {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // 動畫配置
  animations: {
    // 移動端減少動畫以提升性能
    duration: {
      fast: 150,
      normal: 200,
      slow: 300,
    },
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // 字體大小（移動端優化）
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px - 防止 iOS 縮放
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
  },

  // 間距（移動端優化）
  spacing: {
    xs: '0.5rem', // 8px
    sm: '0.75rem', // 12px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
  },

  // 安全區域內邊距
  safeArea: {
    top: 'env(safe-area-inset-top)',
    right: 'env(safe-area-inset-right)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
  },

  // 虛擬鍵盤配置
  keyboard: {
    heightThreshold: 150, // 判斷鍵盤是否打開的高度閾值
    scrollPadding: 100, // 輸入框獲得焦點時的滾動內邊距
  },

  // 圖片優化
  images: {
    lazyLoadOffset: '50px', // 懶加載偏移量
    placeholderQuality: 10, // 佔位圖質量
    mobileQuality: 80, // 移動端圖片質量
    desktopQuality: 90, // 桌面端圖片質量
  },

  // 網絡優化
  network: {
    // 根據網絡類型調整請求策略
    strategies: {
      '4g': {
        batchSize: 50,
        timeout: 10000,
        retries: 3,
      },
      '3g': {
        batchSize: 20,
        timeout: 20000,
        retries: 2,
      },
      '2g': {
        batchSize: 10,
        timeout: 30000,
        retries: 1,
      },
      'slow-2g': {
        batchSize: 5,
        timeout: 60000,
        retries: 1,
      },
    },
  },

  // 性能優化
  performance: {
    // 移動端減少並發請求
    maxConcurrentRequests: 3,
    // 減少動畫
    reducedMotion: true,
    // 延遲非關鍵資源加載
    deferNonCritical: true,
  },
};

// 輔助函數
export const MobileHelpers = {
  // 獲取適合當前設備的圖片質量
  getImageQuality(): number {
    if (typeof window === 'undefined') return 90;
    
    const connection = (navigator as any).connection;
    if (!connection) return MOBILE_CONFIG.images.desktopQuality;
    
    const effectiveType = connection.effectiveType;
    if (effectiveType === '4g') return MOBILE_CONFIG.images.desktopQuality;
    if (effectiveType === '3g') return MOBILE_CONFIG.images.mobileQuality;
    return MOBILE_CONFIG.images.mobileQuality - 10; // 更低質量
  },

  // 獲取網絡策略
  getNetworkStrategy() {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return MOBILE_CONFIG.network.strategies['4g'];
    }
    
    const connection = (navigator as any).connection;
    const effectiveType = connection.effectiveType || '4g';
    return MOBILE_CONFIG.network.strategies[effectiveType] || MOBILE_CONFIG.network.strategies['4g'];
  },

  // 判斷是否應該減少動畫
  shouldReduceMotion(): boolean {
    if (typeof window === 'undefined') return false;
    
    // 檢查用戶偏好
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return true;
    
    // 檢查電池狀態
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.level < 0.2) return true; // 電量低於 20%
      });
    }
    
    return false;
  },
};