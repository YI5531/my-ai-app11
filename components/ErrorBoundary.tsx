import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // 可选：发送错误日志到分析服务
    if (window.parent) {
      try {
        window.parent.postMessage({
          type: 'NEXUS_LOG',
          payload: {
            type: 'error',
            message: `ErrorBoundary: ${error.message}`,
            stack: error.stack,
            timestamp: Date.now()
          }
        }, '*');
      } catch (e) {
        // 忽略跨域错误
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cassette-dark flex items-center justify-center p-6 font-mono">
          <div className="max-w-2xl w-full bg-cassette-plastic border border-red-500/30 rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-900/40 to-red-800/30 border-b border-red-500/30 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-industrial text-white tracking-wider">
                    SYSTEM ERROR
                  </h1>
                  <p className="text-sm text-red-400 mt-1">
                    {this.props.fallbackMessage || '应用运行时发生了意外错误'}
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-6 space-y-4">
              {this.state.error && (
                <div className="bg-black/40 border border-white/10 rounded p-4">
                  <div className="text-xs text-red-400 font-bold mb-2 uppercase tracking-wider">
                    Error Message:
                  </div>
                  <div className="text-sm text-red-300 font-mono break-words">
                    {this.state.error.message}
                  </div>
                </div>
              )}

              {this.state.error?.stack && (
                <details className="bg-black/40 border border-white/10 rounded">
                  <summary className="p-4 cursor-pointer text-xs text-gray-400 hover:text-white font-bold uppercase tracking-wider">
                    Stack Trace (点击展开)
                  </summary>
                  <pre className="p-4 text-xs text-gray-500 overflow-x-auto border-t border-white/10">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              {this.state.errorInfo?.componentStack && (
                <details className="bg-black/40 border border-white/10 rounded">
                  <summary className="p-4 cursor-pointer text-xs text-gray-400 hover:text-white font-bold uppercase tracking-wider">
                    Component Stack (点击展开)
                  </summary>
                  <pre className="p-4 text-xs text-gray-500 overflow-x-auto border-t border-white/10">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 bg-black/20 border-t border-white/10 flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-cassette-accent hover:brightness-110 text-black font-bold py-3 px-6 rounded transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <RefreshCw size={18} />
                重试
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 bg-cassette-highlight hover:brightness-110 text-black font-bold py-3 px-6 rounded transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <Home size={18} />
                返回首页
              </button>
            </div>

            {/* Footer Tip */}
            <div className="px-6 pb-6">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 text-xs text-blue-300">
                <strong>💡 提示:</strong> 如果问题持续出现，请尝试清除应用数据或重新导入项目。
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
