import React, { useState, useRef, useEffect } from 'react';
import { useVirtualKeyboard } from '../../hooks/useMobileOptimization';

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: React.ReactNode;
  onClear?: () => void;
  touchFriendly?: boolean;
}

export const MobileInput: React.FC<MobileInputProps> = ({
  label,
  error,
  suffix,
  onClear,
  touchFriendly = true,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOpen: isKeyboardOpen } = useVirtualKeyboard();

  // 防止輸入時縮放
  useEffect(() => {
    const metaViewport = document.querySelector('meta[name=viewport]');
    const originalContent = metaViewport?.getAttribute('content') || '';

    if (isFocused && touchFriendly) {
      metaViewport?.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0'
      );
    }

    return () => {
      if (metaViewport) {
        metaViewport.setAttribute('content', originalContent);
      }
    };
  }, [isFocused, touchFriendly]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
    
    // 滾動到輸入框
    if (touchFriendly && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const hasValue = props.value && String(props.value).length > 0;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label 
          htmlFor={props.id}
          className={`
            block text-sm font-medium mb-2 transition-colors duration-200
            ${isFocused ? 'text-indigo-400' : 'text-gray-300'}
            ${error ? 'text-red-400' : ''}
          `}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`
            w-full bg-gray-800 border rounded-lg
            transition-all duration-200 outline-none
            ${touchFriendly 
              ? 'px-4 py-4 text-base' // 更大的觸控目標
              : 'px-3 py-2 text-sm'
            }
            ${isFocused 
              ? 'border-indigo-500 ring-2 ring-indigo-500/50' 
              : 'border-gray-700 hover:border-gray-600'
            }
            ${error 
              ? 'border-red-500 ring-2 ring-red-500/50' 
              : ''
            }
            ${props.disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
            }
            ${suffix || (onClear && hasValue) ? 'pr-12' : ''}
          `}
          style={{
            fontSize: touchFriendly ? '16px' : undefined, // 防止 iOS 縮放
          }}
        />

        {/* 後綴或清除按鈕 */}
        {(suffix || (onClear && hasValue)) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {onClear && hasValue && (
              <button
                type="button"
                onClick={onClear}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="清除"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {suffix}
          </div>
        )}
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {/* 鍵盤間距（僅在移動端） */}
      {isKeyboardOpen && isFocused && (
        <div style={{ height: '100px' }} />
      )}
    </div>
  );
};

// 數字輸入組件
export const MobileNumberInput: React.FC<MobileInputProps & {
  min?: number;
  max?: number;
  step?: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
}> = ({
  min,
  max,
  step = 1,
  onIncrement,
  onDecrement,
  ...props
}) => {
  const handleIncrement = () => {
    const currentValue = Number(props.value) || 0;
    const newValue = Math.min(currentValue + step, max || Infinity);
    props.onChange?.({ target: { value: String(newValue) } } as any);
    onIncrement?.();
  };

  const handleDecrement = () => {
    const currentValue = Number(props.value) || 0;
    const newValue = Math.max(currentValue - step, min || 0);
    props.onChange?.({ target: { value: String(newValue) } } as any);
    onDecrement?.();
  };

  return (
    <div className="relative">
      <MobileInput
        {...props}
        type="number"
        inputMode="decimal"
        pattern="[0-9]*"
        min={min}
        max={max}
        step={step}
      />

      {/* 增減按鈕 */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
        <button
          type="button"
          onClick={handleIncrement}
          disabled={props.disabled || (max !== undefined && Number(props.value) >= max)}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="增加"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={props.disabled || (min !== undefined && Number(props.value) <= min)}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="減少"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
};