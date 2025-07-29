// src/components/ui/ErrorDisplay.tsx
// 智能錯誤顯示組件 - 提供用戶友好的錯誤處理 UI

import React, { useState, useEffect } from 'react';
import { Icons } from './icons';
import { ActionButton } from './ActionButton';
import type { ProcessedError } from '../../utils/errorHandler';

interface ErrorDisplayProps {
  error: ProcessedError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = '',
  compact = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      
      // 如果有自動重試延遲，顯示倒計時
      if (error.retryDelay && error.isRetryable) {
        setCountdown(Math.ceil(error.retryDelay / 1000));
        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev && prev > 1) {
              return prev - 1;
            } else {
              clearInterval(interval);
              // 自動重試
              if (onRetry) {
                onRetry();
              }
              return null;
            }
          });
        }, 1000);
        
        return () => clearInterval(interval);
      }
    } else {
      setIsVisible(false);
      setCountdown(null);
    }
  }, [error, onRetry]);

  if (!error || !isVisible) return null;

  const severityStyles = {
    low: 'bg-yellow-900/20 border-yellow-600/30 text-yellow-200',
    medium: 'bg-orange-900/20 border-orange-600/30 text-orange-200',
    high: 'bg-red-900/20 border-red-600/30 text-red-200',
    critical: 'bg-red-900/40 border-red-500/50 text-red-100'
  };

  const severityIcons = {
    low: Icons.AlertTriangle,
    medium: Icons.AlertCircle,
    high: Icons.XCircle,
    critical: Icons.AlertOctagon
  };

  const SeverityIcon = severityIcons[error.severity];

  const handleAction = async () => {
    if (!error.action?.handler) return;
    
    try {
      await error.action.handler();
    } catch (actionError) {
      console.error('Error action failed:', actionError);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg border ${severityStyles[error.severity]} ${className}`}>
        <SeverityIcon className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm flex-1 min-w-0 truncate">{error.message}</span>
        {error.isRetryable && onRetry && (
          <ActionButton
            onClick={onRetry}
            className="px-2 py-1 text-xs"
            disabled={countdown !== null}
          >
            {countdown ? `${countdown}s` : '重試'}
          </ActionButton>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-white/10 rounded"
        >
          <Icons.X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${severityStyles[error.severity]} ${className}`}>
      <div className="flex items-start gap-3">
        <SeverityIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{error.title}</h4>
          <p className="text-sm opacity-90 mb-3">{error.message}</p>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* 重試按鈕 */}
            {error.isRetryable && onRetry && (
              <ActionButton
                onClick={onRetry}
                disabled={countdown !== null}
                className="px-3 py-1.5 text-xs"
              >
                <Icons.RefreshCw className="h-3 w-3 mr-1" />
                {countdown ? `重試 (${countdown}s)` : '重試'}
              </ActionButton>
            )}
            
            {/* 動作按鈕 */}
            {error.action && (
              <ActionButton
                onClick={handleAction}
                className="px-3 py-1.5 text-xs"
                variant="secondary"
              >
                {error.action.type === 'authorize' && <Icons.Shield className="h-3 w-3 mr-1" />}
                {error.action.type === 'adjust_gas' && <Icons.Settings className="h-3 w-3 mr-1" />}
                {error.action.type === 'navigate' && <Icons.ExternalLink className="h-3 w-3 mr-1" />}
                {error.action.type === 'contact_support' && <Icons.MessageCircle className="h-3 w-3 mr-1" />}
                {error.action.label}
              </ActionButton>
            )}
          </div>
        </div>
        
        {/* 關閉按鈕 */}
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-white/10 rounded flex-shrink-0"
        >
          <Icons.X className="h-4 w-4" />
        </button>
      </div>
      
      {/* 進度條（用於倒計時） */}
      {countdown !== null && error.retryDelay && (
        <div className="mt-3 w-full bg-white/20 rounded-full h-1">
          <div
            className="bg-current h-1 rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${((error.retryDelay / 1000 - countdown) / (error.retryDelay / 1000)) * 100}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

// Toast 風格的錯誤顯示
interface ErrorToastProps {
  error: ProcessedError | null;
  onClose?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoClose?: number; // 自動關閉時間（毫秒）
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onClose,
  position = 'top-right',
  autoClose = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      
      if (autoClose > 0 && error.severity !== 'critical') {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300); // 等待動畫完成
        }, autoClose);
        
        return () => clearTimeout(timer);
      }
    }
  }, [error, autoClose, onClose]);

  if (!error) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 max-w-sm w-full`}>
      <div
        className={`transform transition-all duration-300 ${
          isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        <ErrorDisplay
          error={error}
          onDismiss={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          compact={true}
          className="shadow-lg"
        />
      </div>
    </div>
  );
};

// Hook 用於管理錯誤狀態
export const useErrorDisplay = () => {
  const [currentError, setCurrentError] = useState<ProcessedError | null>(null);

  const showError = (error: ProcessedError) => {
    setCurrentError(error);
  };

  const clearError = () => {
    setCurrentError(null);
  };

  return {
    currentError,
    showError,
    clearError
  };
};