// src/hooks/useResponsive.ts
// 響應式設計輔助 hook

import { useState, useEffect } from 'react';

export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTablet, isDesktop };
};

// 響應式樣式類別生成器
export const getResponsiveClasses = (baseClasses: string, mobileClasses?: string, tabletClasses?: string) => {
  return `${baseClasses} ${mobileClasses ? `sm:${mobileClasses}` : ''} ${tabletClasses ? `md:${tabletClasses}` : ''}`;
};

// 預覽頁面專用響應式類別
export const previewResponsiveClasses = {
  mainTitle: 'text-2xl md:text-3xl lg:text-4xl',
  subtitle: 'text-sm md:text-base lg:text-lg',
  cardTitle: 'text-lg md:text-xl lg:text-2xl',
  cardText: 'text-xs md:text-sm lg:text-base',
  button: 'px-4 py-2 text-sm md:px-6 md:py-3 md:text-base lg:px-8 lg:text-lg',
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6',
  padding: 'p-3 md:p-4 lg:p-6',
  spacing: 'space-y-4 md:space-y-6 lg:space-y-8',
  tabButton: 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm lg:px-6 lg:text-base',
};