import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 使用 logger 而不是 console.error
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 shadow-xl">
            <h2 className="text-xl font-bold text-red-400 mb-4">⚠️ 發生錯誤</h2>
            <p className="text-gray-300 mb-4">
              應用程式遇到了意外錯誤。請嘗試重新整理頁面或聯繫支援團隊。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              重新整理頁面
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                  錯誤詳情 (開發模式)
                </summary>
                <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}