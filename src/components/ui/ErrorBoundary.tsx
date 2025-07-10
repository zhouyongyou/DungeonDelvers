import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    // 更新 state 使得下一次渲染能够显示降级后的 UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="card-bg p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">😵 哎呀！出了點問題</h2>
            <p className="text-gray-300 mb-6">應用程式遇到了一個錯誤，請稍後再試。</p>
            
            {/* 错误详情 - 仅在开发环境显示 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-gray-900 p-4 rounded-lg mb-4">
                <summary className="cursor-pointer text-yellow-400 mb-2">
                  開發者除錯資訊 (點擊展開)
                </summary>
                <div className="text-xs text-gray-400 font-mono overflow-auto">
                  <strong>錯誤訊息:</strong>
                  <pre className="text-red-300 mb-2">{this.state.error.message}</pre>
                  <strong>錯誤堆疊:</strong>
                  <pre className="text-gray-300">{this.state.error.stack}</pre>
                  {this.state.errorInfo && (
                    <>
                      <strong>組件堆疊:</strong>
                      <pre className="text-blue-300">{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary px-6 py-3"
              >
                🔄 重新載入頁面
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="btn-secondary px-6 py-3"
              >
                🔧 重試
              </button>
            </div>
            
            {/* 帮助信息 */}
            <div className="mt-6 text-sm text-gray-400">
              <p>如果問題持續存在，請檢查：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>網路連接是否正常</li>
                <li>錢包是否正確連接到 BSC 主網</li>
                <li>是否具有管理員權限</li>
                <li>瀏覽器控制台是否有錯誤訊息</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}