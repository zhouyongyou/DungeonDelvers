import React from 'react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export interface LoadingStateOptions {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  inline?: boolean;
}

export function useLoadingState() {
  // 渲染加載狀態的通用函數
  const renderLoading = (
    isLoading: boolean, 
    content: React.ReactNode, 
    options: LoadingStateOptions = {}
  ) => {
    if (!isLoading) return content;

    const { size = 'md', color, text, inline = false } = options;
    
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    };

    if (inline) {
      return (
        <span className="inline-flex items-center gap-2">
          <LoadingSpinner size={sizeClasses[size]} color={color} />
          {text && <span className="text-sm text-gray-400">{text}</span>}
        </span>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <LoadingSpinner size={sizeClasses[size]} color={color} />
        {text && <p className="text-sm text-gray-400">{text}</p>}
      </div>
    );
  };

  // 渲染文本加載狀態
  const renderTextLoading = (
    isLoading: boolean, 
    content: React.ReactNode,
    placeholder: string = '載入中...'
  ) => {
    return isLoading ? (
      <span className="text-gray-400">{placeholder}</span>
    ) : content;
  };

  // 渲染骨架屏加載狀態
  const renderSkeletonLoading = (
    isLoading: boolean,
    content: React.ReactNode,
    skeletonConfig: {
      lines?: number;
      width?: string;
      height?: string;
      className?: string;
    } = {}
  ) => {
    if (!isLoading) return content;

    const { lines = 1, width = 'w-full', height = 'h-4', className = '' } = skeletonConfig;

    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${width} ${height} bg-gray-700 rounded animate-pulse`}
          />
        ))}
      </div>
    );
  };

  // 渲染數值加載狀態（用於統計數據）
  const renderNumberLoading = (
    isLoading: boolean,
    value: string | number,
    options: {
      placeholder?: string;
      className?: string;
      prefix?: string;
      suffix?: string;
    } = {}
  ) => {
    const { placeholder = '...', className = '', prefix = '', suffix = '' } = options;

    if (isLoading) {
      return (
        <span className={`text-gray-400 ${className}`}>
          {prefix}{placeholder}{suffix}
        </span>
      );
    }

    return (
      <span className={className}>
        {prefix}{value}{suffix}
      </span>
    );
  };

  // 渲染圖片加載狀態
  const renderImageLoading = (
    isLoading: boolean,
    imageElement: React.ReactNode,
    options: {
      aspectRatio?: string;
      className?: string;
      placeholder?: React.ReactNode;
    } = {}
  ) => {
    const { aspectRatio = 'aspect-square', className = '', placeholder } = options;

    if (isLoading) {
      return (
        <div className={`${aspectRatio} bg-gray-800 rounded-lg animate-pulse flex items-center justify-center ${className}`}>
          {placeholder || (
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
      );
    }

    return imageElement;
  };

  // 渲染按鈕加載狀態
  const renderButtonLoading = (
    isLoading: boolean,
    children: React.ReactNode,
    loadingText?: string
  ) => {
    if (isLoading) {
      return (
        <span className="flex items-center gap-2">
          <LoadingSpinner size="h-4 w-4" />
          {loadingText || '處理中...'}
        </span>
      );
    }

    return children;
  };

  // 創建加載狀態包裝器
  const createLoadingWrapper = (defaultOptions: LoadingStateOptions = {}) => {
    return (isLoading: boolean, content: React.ReactNode, options?: LoadingStateOptions) => {
      return renderLoading(isLoading, content, { ...defaultOptions, ...options });
    };
  };

  return {
    renderLoading,
    renderTextLoading,
    renderSkeletonLoading,
    renderNumberLoading,
    renderImageLoading,
    renderButtonLoading,
    createLoadingWrapper,
  };
}

// 預設的加載狀態包裝器
export const LoadingStates = {
  // 頁面級加載
  page: (isLoading: boolean, content: React.ReactNode) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="h-10 w-10" />
            <p className="text-lg text-gray-400">載入中...</p>
          </div>
        </div>
      );
    }
    return content;
  },

  // 卡片級加載
  card: (isLoading: boolean, content: React.ReactNode) => {
    if (isLoading) {
      return (
        <div className="bg-gray-800 rounded-xl p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-6 bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-700 rounded w-1/2" />
            <div className="h-4 bg-gray-700 rounded w-2/3" />
          </div>
        </div>
      );
    }
    return content;
  },

  // 列表項加載
  listItem: (isLoading: boolean, content: React.ReactNode) => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-4 p-4 animate-pulse">
          <div className="h-12 w-12 bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      );
    }
    return content;
  },

  // 統計數據加載
  stat: (isLoading: boolean, value: string | number, label?: string) => {
    if (isLoading) {
      return (
        <div className="text-center space-y-2">
          <div className="h-8 w-16 bg-gray-700 rounded mx-auto animate-pulse" />
          {label && <p className="text-sm text-gray-400">{label}</p>}
        </div>
      );
    }
    return (
      <div className="text-center space-y-2">
        <p className="text-2xl font-bold text-white">{value}</p>
        {label && <p className="text-sm text-gray-400">{label}</p>}
      </div>
    );
  },
};