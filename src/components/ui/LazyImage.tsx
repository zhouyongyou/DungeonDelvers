// src/components/ui/LazyImage.tsx - 懶加載圖片組件

import React, { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  placeholder?: 'blur' | 'spinner' | 'skeleton';
  onLoad?: () => void;
  onError?: () => void;
  eager?: boolean; // 是否立即加載
  width?: number;
  height?: number;
  aspectRatio?: string; // 例如 "1/1", "16/9"
}

export const LazyImage: React.FC<LazyImageProps> = ({
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
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eager) {
      loadImage();
      return;
    }

    // 使用 Intersection Observer 實現懶加載
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // 提前 50px 開始加載
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, eager]);

  const loadImage = () => {
    // 預加載圖片
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      setHasError(false);
      onLoad?.();
    };

    img.onerror = () => {
      if (fallback) {
        // 如果有 fallback，嘗試載入 fallback 圖片
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setImageSrc(fallback);
          setIsLoading(false);
          setHasError(false);
        };
        fallbackImg.onerror = () => {
          setIsLoading(false);
          setHasError(true);
          onError?.();
        };
        fallbackImg.src = fallback;
      } else {
        setIsLoading(false);
        setHasError(true);
        onError?.();
      }
    };

    // 開始加載
    img.src = src;
  };

  const renderPlaceholder = () => {
    switch (placeholder) {
      case 'blur':
        return (
          <div className={`${className} bg-gray-800/50 backdrop-blur-sm animate-pulse`} />
        );
      case 'spinner':
        return (
          <div className={`${className} bg-gray-800/50 flex items-center justify-center`}>
            <LoadingSpinner size="h-8 w-8" />
          </div>
        );
      case 'skeleton':
      default:
        return (
          <div className={`${className} bg-gray-800/50 animate-pulse`}>
            <div className="w-full h-full bg-gradient-to-br from-gray-700/50 to-gray-800/50" />
          </div>
        );
    }
  };

  // 計算容器樣式以預留空間
  const containerStyle: React.CSSProperties = {
    aspectRatio: aspectRatio,
  };

  return (
    <div 
      ref={containerRef} 
      className="relative overflow-hidden"
      style={containerStyle}
    >
      {isLoading && renderPlaceholder()}
      
      {imageSrc && (
        <img
          ref={imageRef}
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          loading="lazy"
          decoding="async"
          width={width}
          height={height}
          style={{ 
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      )}

      {hasError && (
        <div className={`${className} absolute inset-0 bg-gray-800 flex items-center justify-center`}>
          <div className="text-center text-gray-500">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs">載入失敗</p>
          </div>
        </div>
      )}
    </div>
  );
};

// 預加載重要圖片
export const preloadImages = (urls: string[]) => {
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
};