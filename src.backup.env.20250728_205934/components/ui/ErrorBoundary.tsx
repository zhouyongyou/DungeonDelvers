import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={`bg-red-900/20 border border-red-500/30 rounded-lg p-4 ${this.props.className || ''}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="text-sm text-red-200">
              <p className="font-medium mb-1">載入失敗</p>
              <p className="text-xs opacity-75">請重新整理頁面或稍後再試</p>
              <button 
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition"
              >
                重試
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 局部錯誤處理組件
export const LocalErrorBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}> = ({ children, fallback, className }) => {
  return (
    <ErrorBoundary 
      fallback={fallback}
      className={className}
    >
      {children}
    </ErrorBoundary>
  );
};

// 載入狀態組件
export const LoadingState: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = "載入中...", className = "" }) => (
  <div className={`flex items-center justify-center p-4 ${className}`}>
    <div className="flex items-center gap-2 text-gray-400">
      <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
      <span className="text-sm">{message}</span>
    </div>
  </div>
);

// 錯誤狀態組件
export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
  className?: string;
}> = ({ message = "載入失敗", onRetry, className = "" }) => (
  <div className={`bg-red-900/20 border border-red-500/30 rounded-lg p-3 ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">!</span>
        </div>
        <span className="text-sm text-red-200">{message}</span>
      </div>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition"
        >
          重試
        </button>
      )}
    </div>
  </div>
);