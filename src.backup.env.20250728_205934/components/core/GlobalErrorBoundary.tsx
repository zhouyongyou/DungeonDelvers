import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 記錄錯誤到日誌系統
    logger.error('Global error boundary caught error:', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'GlobalErrorBoundary',
    });

    this.setState({
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">😵</div>
              <h1 className="text-3xl font-bold text-red-400 mb-2">
                哎呀！出現了一些問題
              </h1>
              <p className="text-gray-400">
                應用程式遇到了意外錯誤，我們正在努力修復。
              </p>
            </div>

            {/* 錯誤詳情（開發環境顯示） */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-gray-900 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">
                  錯誤詳情（僅開發環境可見）：
                </h3>
                <pre className="text-xs text-red-300 overflow-x-auto">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                      組件堆疊
                    </summary>
                    <pre className="text-xs text-gray-500 mt-2 overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
              >
                重試
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                返回首頁
              </button>
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>如果問題持續發生，請聯繫技術支援</p>
              <p className="mt-1">錯誤 ID: {Date.now()}</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}