// src/components/ui/EnhancedLazyImage.tsx - 增強版懶加載圖片組件

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { preloadStrategy, imageUtils, globalLazyLoader } from '../../utils/imageOptimizer';

interface EnhancedLazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  placeholder?: 'blur' | 'spinner' | 'skeleton';
  onLoad?: () => void;
  onError?: (error: Error) => void;
  eager?: boolean;
  width?: number;
  height?: number;
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'scale-down' | 'none';
  // 新的優化選項
  enableWebP?: boolean;
  enablePreload?: boolean;
  quality?: number;
  priority?: 'high' | 'low';
}

export const EnhancedLazyImage: React.FC<EnhancedLazyImageProps> = ({
  src,
  alt,
  className = '',
  fallback = '/images/placeholder.png',
  placeholder = 'skeleton',
  onLoad,
  onError,
  eager = false,
  width,
  height,
  aspectRatio = '1/1',
  objectFit = 'contain',
  enableWebP = true,
  enablePreload = true,
  quality = 80,
  priority = 'low',
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // 獲取容器寬度，用於圖片優化
  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setContainerWidth(width);
    }
  }, []);

  // 優化圖片 URL
  const getOptimizedUrl = useCallback(async (originalUrl: string): Promise<string> => {
    let optimizedUrl = originalUrl;

    // 響應式圖片優化
    if (containerWidth > 0) {
      optimizedUrl = imageUtils.getOptimalImageSize(originalUrl, containerWidth);
    }

    // WebP 格式優化
    if (enableWebP) {
      optimizedUrl = await imageUtils.getWebPUrl(optimizedUrl);
    }

    return optimizedUrl;
  }, [containerWidth, enableWebP]);

  // 圖片加載函數
  const loadImage = useCallback(async () => {
    try {
      // 首先檢查緩存
      const cachedUrl = await preloadStrategy.getCachedImage(src);
      if (cachedUrl) {
        setImageSrc(cachedUrl);
        setIsLoading(false);
        setHasError(false);
        setTimeout(() => setShowPlaceholder(false), 100);
        onLoad?.();
        return;
      }

      // 獲取優化的 URL
      const optimizedUrl = await getOptimizedUrl(src);

      // 預加載圖片
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(optimizedUrl);
        setIsLoading(false);
        setHasError(false);
        setTimeout(() => setShowPlaceholder(false), 100);
        onLoad?.();
      };

      img.onerror = async () => {
        if (fallback) {
          // 嘗試 fallback 圖片
          const fallbackImg = new Image();
          const optimizedFallback = await getOptimizedUrl(fallback);
          
          fallbackImg.onload = () => {
            setImageSrc(optimizedFallback);
            setIsLoading(false);
            setHasError(false);
            setTimeout(() => setShowPlaceholder(false), 100);
          };
          
          fallbackImg.onerror = () => {
            setIsLoading(false);
            setHasError(true);
            onError?.(new Error(`Failed to load image and fallback: ${src}`));
          };
          
          fallbackImg.src = optimizedFallback;
        } else {
          setIsLoading(false);
          setHasError(true);
          onError?.(new Error(`Failed to load image: ${src}`));
        }
      };

      img.src = optimizedUrl;
    } catch (error) {
      setIsLoading(false);
      setHasError(true);
      onError?.(error as Error);
    }
  }, [src, fallback, getOptimizedUrl, onLoad, onError]);

  // 懶加載邏輯
  useEffect(() => {
    if (eager || priority === 'high') {
      loadImage();
      return;
    }

    if (containerRef.current) {
      globalLazyLoader.observe(containerRef.current, loadImage);
    }

    return () => {
      if (containerRef.current) {
        globalLazyLoader.unobserve(containerRef.current);
      }
    };
  }, [eager, priority, loadImage]);

  // 預加載相關圖片
  useEffect(() => {
    if (enablePreload && priority === 'high') {
      preloadStrategy.preloadCriticalImages([src]);
    }
  }, [src, enablePreload, priority]);

  // 渲染占位符
  const renderPlaceholder = () => {
    const baseClasses = "w-full h-full flex items-center justify-center";

    switch (placeholder) {
      case 'blur':
        return (
          <div className={`bg-gray-200 animate-pulse ${baseClasses} ${className}`}>
            <div className="w-8 h-8 bg-gray-300 rounded"></div>
          </div>
        );
      
      case 'spinner':
        return (
          <div className={`bg-gray-800 ${baseClasses} ${className}`}>
            <LoadingSpinner size="h-8 w-8" />
          </div>
        );
      
      case 'skeleton':
      default:
        return (
          <div className={`bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse ${baseClasses} ${className}`}>
            <div className="w-full h-full bg-gray-600 opacity-50"></div>
          </div>
        );
    }
  };

  // 錯誤狀態
  if (hasError) {
    return (
      <div 
        ref={containerRef}
        className={`bg-gray-800 flex items-center justify-center text-gray-400 ${className}`}
        style={{ 
          aspectRatio,
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : 'auto',
        }}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">🖼️</div>
          <div className="text-xs">圖片載入失敗</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      {/* 占位符 */}
      {showPlaceholder && (
        <div className="absolute inset-0">
          {renderPlaceholder()}
        </div>
      )}
      
      {/* 實際圖片 */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`transition-opacity duration-300 ${
            showPlaceholder ? 'opacity-0' : 'opacity-100'
          } ${className}`}
          style={{
            aspectRatio,
            width: '100%',
            height: '100%',
            objectFit: objectFit,
            objectPosition: 'center center',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
          loading={eager ? 'eager' : 'lazy'}
          decoding={priority === 'high' ? 'sync' : 'async'}
        />
      )}
    </div>
  );
};

// 向後兼容的別名
export { EnhancedLazyImage as LazyImageV2 };