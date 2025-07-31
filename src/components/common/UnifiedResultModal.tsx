import React from 'react';
import { useLoadingState } from '../../hooks/useLoadingState';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { Modal } from '../ui/Modal';

interface ResultData {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  transactionHash?: string;
  details?: Array<{
    label: string;
    value: string | number | React.ReactNode;
  }>;
  actions?: Array<{
    label: string;
    variant: 'primary' | 'secondary' | 'danger';
    onClick: () => void;
  }>;
}

interface UnifiedResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ResultData;
  loading?: boolean;
  showCloseButton?: boolean;
}

export const UnifiedResultModal: React.FC<UnifiedResultModalProps> = ({
  isOpen,
  onClose,
  data,
  loading = false,
  showCloseButton = true,
}) => {
  const { renderLoading, renderTextLoading } = useLoadingState();
  const { isMobile } = useMobileOptimization();

  if (!isOpen) return null;

  const getIcon = () => {
    switch (data.type) {
      case 'success':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'info':
      default:
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getButtonClass = (variant: string) => {
    const baseClass = "w-full inline-flex justify-center rounded-md border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
    
    switch (variant) {
      case 'primary':
        return `${baseClass} border-transparent bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500`;
      case 'danger':
        return `${baseClass} border-transparent bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
      case 'secondary':
      default:
        return `${baseClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500`;
    }
  };

  const getTypeIcon = () => {
    switch (data.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const primaryAction = data.actions?.[0];
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${getTypeIcon()} ${data.title}`}
      onConfirm={primaryAction?.onClick || onClose}
      confirmText={primaryAction?.label || '關閉'}
      maxWidth="lg"
      disabled={loading}
      isLoading={loading}
      showCloseButton={showCloseButton}
    >
      <div className="space-y-6">
        {renderLoading(loading, (
          <>
            {/* 消息 */}
            <div className="text-center">
              <div className="mb-4">
                {getIcon()}
              </div>
              <p className="text-gray-300">
                {data.message}
              </p>
            </div>

            {/* 交易哈希 */}
            {data.transactionHash && (
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">交易哈希:</p>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-green-400 font-mono break-all">
                    {data.transactionHash}
                  </p>
                  <button
                    onClick={() => {
                      window.open(`https://bscscan.com/tx/${data.transactionHash}`, '_blank');
                    }}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* 詳細信息 */}
            {data.details && data.details.length > 0 && (
              <div className="space-y-2">
                {data.details.map((detail, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                    <span className="text-sm text-gray-400">{detail.label}:</span>
                    <span className="text-sm text-white font-medium">
                      {typeof detail.value === 'string' || typeof detail.value === 'number' 
                        ? detail.value
                        : detail.value
                      }
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 額外操作按鈕 */}
            {data.actions && data.actions.length > 1 && (
              <div className="space-y-2">
                {data.actions.slice(1).map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={getButtonClass(action.variant)}
                    disabled={loading}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </>
        ), {
          text: '載入中...',
          size: 'lg'
        })}
      </div>
    </Modal>
  );
};