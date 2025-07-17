import { useEffect, useRef } from 'react';
import { prefetchPages, PREFETCH_GROUPS } from '../components/core/RouteManager';
import { useAccount } from 'wagmi';
import { APP_CONSTANTS } from '../config/constants';

interface PreloaderOptions {
  enableImagePreload?: boolean;
  enableFontPreload?: boolean;
  enablePagePreload?: boolean;
  enableDataPreload?: boolean;
  delayMs?: number;
}

export function useResourcePreloader(options: PreloaderOptions = {}) {
  const {
    enableImagePreload = true,
    enableFontPreload = true,
    enablePagePreload = true,
    enableDataPreload = true,
    delayMs = 2000,
  } = options;

  const { isConnected } = useAccount();
  const preloadedRef = useRef(new Set<string>());

  // 預加載關鍵圖片
  const preloadImages = () => {
    const criticalImages = [
      '/images/hero-placeholder.webp',
      '/images/relic-placeholder.webp',
      '/images/party-placeholder.webp',
      '/images/vip-background.webp',
      '/images/logo.png',
    ];

    criticalImages.forEach(src => {
      if (!preloadedRef.current.has(src)) {
        const img = new Image();
        img.src = src;
        preloadedRef.current.add(src);
      }
    });
  };

  // 預加載字體
  const preloadFonts = () => {
    const fonts = [
      'Inter',
      'Roboto Mono',
    ];

    fonts.forEach(font => {
      if (!preloadedRef.current.has(`font-${font}`)) {
        try {
          document.fonts.load(`16px ${font}`);
          preloadedRef.current.add(`font-${font}`);
        } catch (error) {
          console.warn(`Failed to preload font: ${font}`, error);
        }
      }
    });
  };

  // 智能頁面預取
  const preloadPages = () => {
    const preloadKey = 'pages-preloaded';
    if (preloadedRef.current.has(preloadKey)) return;

    // 根據用戶連接狀態決定預取策略
    if (isConnected) {
      // 已連接用戶預取活躍用戶常用頁面
      setTimeout(() => {
        prefetchPages(PREFETCH_GROUPS.active);
      }, delayMs);
      
      // 延遲預取其他頁面
      setTimeout(() => {
        prefetchPages(PREFETCH_GROUPS.vip);
      }, delayMs * 2);
    } else {
      // 未連接用戶預取新用戶常用頁面
      setTimeout(() => {
        prefetchPages(PREFETCH_GROUPS.newcomer);
      }, delayMs);
    }

    preloadedRef.current.add(preloadKey);
  };

  // 預加載關鍵數據
  const preloadData = () => {
    const dataPreloadKey = 'data-preloaded';
    if (!isConnected || preloadedRef.current.has(dataPreloadKey)) return;

    // 可以在這裡預取一些關鍵的 GraphQL 查詢
    // 例如全局統計、排行榜等不依賴用戶特定數據的內容
    setTimeout(() => {
      // 預取全局統計
      fetch(`${import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query PreloadGlobalStats {
              globalStats {
                totalPlayers
                totalHeros
                totalRelics
                totalParties
              }
            }
          `
        })
      }).catch(() => {
        // 靜默處理預取錯誤
      });
    }, delayMs);

    preloadedRef.current.add(dataPreloadKey);
  };

  // 預加載關鍵 CSS
  const preloadCriticalCSS = () => {
    const cssPreloadKey = 'css-preloaded';
    if (preloadedRef.current.has(cssPreloadKey)) return;

    // 預加載關鍵 CSS 類
    const criticalCSS = `
      .text-gradient-primary { background: linear-gradient(45deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .glass-effect { backdrop-filter: blur(10px); background: rgba(17, 24, 39, 0.8); }
      .nft-card-hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); }
    `;

    const style = document.createElement('style');
    style.textContent = criticalCSS;
    document.head.appendChild(style);

    preloadedRef.current.add(cssPreloadKey);
  };

  // 網路感知預加載
  const getConnectionType = () => {
    // @ts-ignore - navigator.connection 可能不存在
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return connection?.effectiveType || '4g';
  };

  const shouldPreload = () => {
    const connectionType = getConnectionType();
    const lowBandwidth = ['slow-2g', '2g', '3g'].includes(connectionType);
    
    // 低頻寬時減少預加載
    if (lowBandwidth) {
      return {
        images: false,
        fonts: true,
        pages: false,
        data: false,
      };
    }

    return {
      images: enableImagePreload,
      fonts: enableFontPreload,
      pages: enablePagePreload,
      data: enableDataPreload,
    };
  };

  useEffect(() => {
    // 檢查瀏覽器是否支援 requestIdleCallback
    const runWhenIdle = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 5000 });
      } else {
        setTimeout(callback, delayMs);
      }
    };

    const preloadSettings = shouldPreload();

    // 分批執行預加載，避免阻塞主線程
    if (preloadSettings.fonts) {
      runWhenIdle(preloadFonts);
    }

    if (preloadSettings.images) {
      runWhenIdle(() => {
        setTimeout(preloadImages, 500);
      });
    }

    if (preloadSettings.pages) {
      runWhenIdle(() => {
        setTimeout(preloadPages, 1000);
      });
    }

    if (preloadSettings.data) {
      runWhenIdle(() => {
        setTimeout(preloadData, 1500);
      });
    }

    // 總是預加載關鍵 CSS
    runWhenIdle(preloadCriticalCSS);

  }, [isConnected, delayMs]);

  return {
    preloadImages,
    preloadFonts,
    preloadPages,
    preloadData,
    isPreloaded: (key: string) => preloadedRef.current.has(key),
  };
}

// Service Worker 註冊（可選）
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError);
    }
  }
};

// 快取策略輔助函數
export const getCacheStrategy = (resourceType: 'page' | 'image' | 'data' | 'font') => {
  const strategies = {
    page: {
      cacheName: 'pages-cache-v1',
      maxAge: APP_CONSTANTS.CACHE_TTL.LONG,
      strategy: 'stale-while-revalidate',
    },
    image: {
      cacheName: 'images-cache-v1',
      maxAge: APP_CONSTANTS.CACHE_TTL.EXTRA_LONG,
      strategy: 'cache-first',
    },
    data: {
      cacheName: 'data-cache-v1',
      maxAge: APP_CONSTANTS.CACHE_TTL.MEDIUM,
      strategy: 'network-first',
    },
    font: {
      cacheName: 'fonts-cache-v1',
      maxAge: APP_CONSTANTS.CACHE_TTL.EXTRA_LONG,
      strategy: 'cache-first',
    },
  };

  return strategies[resourceType];
};