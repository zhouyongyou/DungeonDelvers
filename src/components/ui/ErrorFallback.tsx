// ErrorFallback.tsx - 優雅的錯誤回退界面
import React from 'react';
import { AlertTriangle, RefreshCw, Home, HelpCircle } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';
import { processError, ProcessedError } from '../../utils/errorHandler';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  componentStack?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary,
  componentStack 
}) => {
  const processedError: ProcessedError = processError(error, {
    component: componentStack?.split('\n')[0] || 'Unknown'
  });

  const getSeverityColor = (severity: ProcessedError['severity']) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-900/20';
      case 'high': return 'border-orange-500 bg-orange-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-900/20';
      case 'low': return 'border-blue-500 bg-blue-900/20';
    }
  };

  const handleAction = () => {
    if (processedError.action?.handler) {
      processedError.action.handler();
    } else {
      resetErrorBoundary();
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className={`max-w-lg w-full rounded-xl border-2 p-6 ${getSeverityColor(processedError.severity)}`}>
        {/* 錯誤圖標 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        {/* 錯誤標題 */}
        <h2 className="text-xl font-bold text-center mb-2 text-white">
          {processedError.title}
        </h2>

        {/* 錯誤描述 */}
        <p className="text-center text-gray-300 mb-6">
          {processedError.message}
        </p>

        {/* 操作按鈕 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {processedError.isRetryable && (
            <AnimatedButton
              onClick={handleAction}
              variant="primary"
              animationType="scale"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {processedError.action?.label || '重試'}
            </AnimatedButton>
          )}
          
          <AnimatedButton
            onClick={() => window.location.hash = '#/dashboard'}
            variant="secondary"
            animationType="scale"
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            返回首頁
          </AnimatedButton>
        </div>

        {/* 錯誤詳情（開發模式） */}
        {import.meta.env.DEV && (
          <details className="mt-6 text-xs">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-300 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              錯誤詳情（開發模式）
            </summary>
            <pre className="mt-2 p-3 bg-black/50 rounded overflow-auto text-red-400">
              {error.stack}
            </pre>
          </details>
        )}

        {/* 自動重試提示 */}
        {processedError.retryDelay && (
          <div className="mt-4 text-center text-sm text-gray-400">
            將在 {processedError.retryDelay / 1000} 秒後自動重試...
          </div>
        )}
      </div>
    </div>
  );
};

// 頁面級錯誤邊界組件
export const PageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => <ErrorFallback error={error} resetErrorBoundary={reset} />}
    >
      {children}
    </ErrorBoundary>
  );
};

// 基礎錯誤邊界
class ErrorBoundary extends React.Component<
  { 
    children: React.ReactNode;
    fallback: (error: Error, reset: () => void) => React.ReactNode;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }

    return this.props.children;
  }
}