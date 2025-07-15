// src/hooks/useImageOptimization.ts - 圖片優化 Hook

import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

interface ImageOptimizationOptions {
  format?: 'webp' | 'original';
  quality?: number;
  width?: number;
  height?: number;
}

/**
 * 圖片優化 Hook
 */
export function useImageOptimization() {
  const [supportWebP, setSupportWebP] = useState<boolean | null>(null);

  useEffect(() => {
    // 檢測 WebP 支援
    checkWebPSupport().then(setSupportWebP);
  }, []);

  /**
   * 優化圖片 URL
   */
  const optimizeImageUrl = useCallback((
    url: string,
    options: ImageOptimizationOptions = {}
  ): string => {
    if (!url) return '';

    // 如果是 base64 或 blob URL，直接返回
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    // 如果是 IPFS URL，使用快速網關
    if (url.includes('ipfs://') || url.includes('/ipfs/')) {
      return optimizeIpfsUrl(url);
    }

    // 如果支援 WebP 且圖片不是 GIF，嘗試使用 WebP
    if (supportWebP && !url.includes('.gif') && options.format !== 'original') {
      url = convertToWebP(url);
    }

    // 添加尺寸參數（如果使用圖片服務）
    if (options.width || options.height) {
      url = addSizeParams(url, options.width, options.height);
    }

    return url;
  }, [supportWebP]);

  /**
   * 批量預加載圖片
   */
  const preloadImages = useCallback(async (urls: string[]) => {
    const promises = urls.map(url => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src = optimizeImageUrl(url);
      });
    });

    try {
      await Promise.all(promises);
      logger.debug('圖片預加載完成', { count: urls.length });
    } catch (error) {
      logger.warn('部分圖片預加載失敗', error);
    }
  }, [optimizeImageUrl]);

  return {
    optimizeImageUrl,
    preloadImages,
    supportWebP,
  };
}

/**
 * 檢測 WebP 支援
 */
async function checkWebPSupport(): Promise<boolean> {
  return new Promise(resolve => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * 優化 IPFS URL
 */
function optimizeIpfsUrl(url: string): string {
  // 提取 IPFS hash
  const ipfsMatch = url.match(/ipfs\/([a-zA-Z0-9]+)/);
  if (!ipfsMatch) return url;

  const hash = ipfsMatch[1];
  
  // 使用最快的 IPFS 網關
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${hash}`,
    `https://cloudflare-ipfs.com/ipfs/${hash}`,
    `https://ipfs.io/ipfs/${hash}`,
  ];

  // 隨機選擇一個網關以分散負載
  return gateways[Math.floor(Math.random() * gateways.length)];
}

/**
 * 轉換為 WebP 格式
 */
function convertToWebP(url: string): string {
  // 如果已經是 WebP，直接返回
  if (url.includes('.webp')) return url;

  // 簡單替換擴展名（實際應用中可能需要圖片服務支援）
  return url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
}

/**
 * 添加尺寸參數
 */
function addSizeParams(url: string, width?: number, height?: number): string {
  if (!width && !height) return url;

  const separator = url.includes('?') ? '&' : '?';
  const params: string[] = [];

  if (width) params.push(`w=${width}`);
  if (height) params.push(`h=${height}`);

  return `${url}${separator}${params.join('&')}`;
}

/**
 * 獲取圖片尺寸建議
 */
export function getImageSizeRecommendation(usage: 'thumbnail' | 'card' | 'hero' | 'full') {
  const sizes = {
    thumbnail: { width: 150, height: 150 },
    card: { width: 400, height: 400 },
    hero: { width: 1200, height: 600 },
    full: { width: undefined, height: undefined },
  };

  return sizes[usage] || sizes.full;
}