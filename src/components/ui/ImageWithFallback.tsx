// src/components/ui/ImageWithFallback.tsx
// Enhanced image component with progressive loading and smart fallbacks

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../../utils/logger';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  nftType?: 'hero' | 'relic' | 'party' | 'vip';
  rarity?: number;
  lazy?: boolean;
  showRetry?: boolean;
  onError?: (error: Error) => void;
  onLoad?: () => void;
}

type LoadingState = 'loading' | 'loaded' | 'error' | 'retrying';

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackSrc,
  nftType = 'hero',
  rarity = 1,
  lazy = true,
  showRetry = true,
  onError,
  onLoad
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate smart fallback based on NFT type and rarity
  const getSmartFallback = useCallback((type: string, rarity: number): string => {
    const rarityIndex = Math.max(1, Math.min(5, rarity));
    switch (type) {
      case 'hero':
        return `/images/hero/hero-${rarityIndex}.png`;
      case 'relic':
        return `/images/relic/relic-${rarityIndex}.png`;
      case 'party':
        return `/images/party/party.png`;
      case 'vip':
        return `/images/vip/vip.png`;
      default:
        return `/images/hero/hero-1.png`;
    }
  }, []);

  // Cache successful image URLs in localStorage
  const cacheImageUrl = useCallback((url: string) => {
    try {
      const cache = JSON.parse(localStorage.getItem('nft_image_cache') || '{}');
      cache[src] = url;
      cache.lastUpdated = Date.now();
      // Keep only recent entries (last 24 hours)
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      Object.keys(cache).forEach(key => {
        if (cache[key]?.timestamp && cache[key].timestamp < dayAgo) {
          delete cache[key];
        }
      });
      localStorage.setItem('nft_image_cache', JSON.stringify(cache));
    } catch (error) {
      // Silent fail for localStorage issues
    }
  }, [src]);

  // Check cached image URL
  const getCachedImageUrl = useCallback((): string | null => {
    try {
      const cache = JSON.parse(localStorage.getItem('nft_image_cache') || '{}');
      return cache[src] || null;
    } catch {
      return null;
    }
  }, [src]);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [lazy, isInView]);

  // Handle image loading with progressive fallbacks
  const loadImage = useCallback(async (imageUrl: string) => {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      
      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 8000); // Extended timeout for better reliability

      img.onload = () => {
        clearTimeout(timeout);
        cacheImageUrl(imageUrl);
        resolve(imageUrl);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Image load failed'));
      };

      img.src = imageUrl;
    });
  }, [cacheImageUrl]);

  // Progressive loading strategy
  useEffect(() => {
    if (!isInView) return;

    const loadWithFallbacks = async () => {
      setLoadingState('loading');
      
      // Build fallback hierarchy
      const urlsToTry = [
        getCachedImageUrl(), // Cached URL first
        src, // Original URL
        fallbackSrc, // Custom fallback
        getSmartFallback(nftType, rarity) // Smart fallback based on type/rarity
      ].filter(Boolean) as string[];

      for (let i = 0; i < urlsToTry.length; i++) {
        try {
          const url = urlsToTry[i];
          await loadImage(url);
          setCurrentSrc(url);
          setLoadingState('loaded');
          onLoad?.();
          return;
        } catch (error) {
          logger.warn(`Image load attempt ${i + 1} failed for ${urlsToTry[i]}:`, error);
          
          // If this was the original src and we have retries left, try again
          if (i === 1 && retryCount < 2) {
            setLoadingState('retrying');
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
            setRetryCount(prev => prev + 1);
            return loadWithFallbacks();
          }
        }
      }

      // All fallbacks failed
      setLoadingState('error');
      const error = new Error('All image sources failed to load');
      onError?.(error);
      logger.error('All image fallbacks failed for:', src);
    };

    loadWithFallbacks();
  }, [src, fallbackSrc, nftType, rarity, isInView, retryCount, loadImage, getCachedImageUrl, getSmartFallback, onLoad, onError]);

  // Manual retry function
  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setLoadingState('loading');
    setCurrentSrc('');
  }, []);

  // Render loading placeholder
  if (loadingState === 'loading' || loadingState === 'retrying') {
    return (
      <div className={`${className} bg-gray-700 animate-pulse flex items-center justify-center`} ref={imgRef}>
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-500 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-xs">
            {loadingState === 'retrying' ? `重試中 (${retryCount}/2)` : '載入中...'}
          </div>
        </div>
      </div>
    );
  }

  // Render error state with retry option
  if (loadingState === 'error') {
    return (
      <div className={`${className} bg-gray-800 border border-gray-600 flex flex-col items-center justify-center text-gray-400`} ref={imgRef}>
        <div className="text-center p-4">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-xs mb-3">圖片載入失敗</div>
          {showRetry && (
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              重新載入
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render successfully loaded image
  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={className}
      loading={lazy ? 'lazy' : 'eager'}
      onError={() => {
        // This shouldn't happen as we handle errors in the loading logic,
        // but it's a safety net
        setLoadingState('error');
      }}
    />
  );
};

export default ImageWithFallback;