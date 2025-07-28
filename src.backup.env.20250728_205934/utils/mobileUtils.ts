// 移動端工具函數

// 檢測是否為移動設備
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
};

// 檢測是否支持觸控
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 || 
    (navigator as any).msMaxTouchPoints > 0;
};

// 獲取安全區域內邊距
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  
  const computedStyle = getComputedStyle(document.documentElement);
  return {
    top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
    right: parseInt(computedStyle.getPropertyValue('--sar') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0'),
    left: parseInt(computedStyle.getPropertyValue('--sal') || '0'),
  };
};

// 防止雙擊縮放 - 修復版本（返回清理函數）
export const preventDoubleTapZoom = (element: HTMLElement): (() => void) => {
  let lastTouchEnd = 0;
  
  const handleTouchEnd = (event: TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  };
  
  element.addEventListener('touchend', handleTouchEnd, false);
  
  // 返回清理函數
  return () => {
    element.removeEventListener('touchend', handleTouchEnd, false);
  };
};

// 獲取視口尺寸（考慮移動瀏覽器工具欄）
export const getViewportSize = () => {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  
  // 使用 visualViewport API（如果可用）
  if (window.visualViewport) {
    return {
      width: window.visualViewport.width,
      height: window.visualViewport.height,
    };
  }
  
  // 回退到 window 尺寸
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

// 檢測虛擬鍵盤是否打開
export const isVirtualKeyboardOpen = (): boolean => {
  if (typeof window === 'undefined' || !isMobile()) return false;
  
  const threshold = 150;
  const windowHeight = window.innerHeight;
  const visualHeight = window.visualViewport?.height || windowHeight;
  
  return windowHeight - visualHeight > threshold;
};

// 滾動到元素（考慮固定頭部）
export const scrollToElement = (element: HTMLElement, offset: number = 80): void => {
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;
  
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  });
};

// 創建觸控友好的點擊處理器
export const createTouchHandler = (
  onClick: () => void,
  onLongPress?: () => void,
  delay: number = 500
) => {
  let touchTimer: NodeJS.Timeout | null = null;
  let touchStartX = 0;
  let touchStartY = 0;
  const threshold = 10;
  
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    
    if (onLongPress) {
      touchTimer = setTimeout(() => {
        onLongPress();
        touchTimer = null;
      }, delay);
    }
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = Math.abs(touchX - touchStartX);
    const deltaY = Math.abs(touchY - touchStartY);
    
    // 如果移動超過閾值，取消長按
    if (deltaX > threshold || deltaY > threshold) {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    }
  };
  
  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      onClick();
    }
  };
  
  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

// 格式化移動端友好的地址
export const formatMobileAddress = (address: string, chars: number = 6): string => {
  if (!address || address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

// 獲取適合移動端的圖片尺寸
export const getMobileImageSize = (originalSize: number): number => {
  const pixelRatio = window.devicePixelRatio || 1;
  const viewportWidth = getViewportSize().width;
  
  // 根據視口寬度調整圖片尺寸
  if (viewportWidth < 375) {
    return Math.min(originalSize, 150 * pixelRatio);
  } else if (viewportWidth < 768) {
    return Math.min(originalSize, 200 * pixelRatio);
  }
  
  return originalSize;
};

// 檢測網絡連接類型
export const getNetworkType = (): string => {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'unknown';
  }
  
  const connection = (navigator as any).connection;
  return connection.effectiveType || 'unknown';
};

// 根據網絡狀況調整載入策略
export const shouldLoadHighQuality = (): boolean => {
  const networkType = getNetworkType();
  return networkType === '4g' || networkType === 'wifi';
};