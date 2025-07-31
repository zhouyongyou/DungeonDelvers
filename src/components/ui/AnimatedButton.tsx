// AnimatedButton.tsx - 帶有微交互動畫的按鈕組件
import React, { useState } from 'react';
import { cn } from '../../utils/cn';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  animationType?: 'scale' | 'pulse' | 'ripple';
  hapticFeedback?: boolean;
  children: React.ReactNode;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = '處理中...',
  animationType = 'scale',
  hapticFeedback = true,
  className = '',
  disabled,
  onClick,
  children,
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const variantClasses = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // 震動反饋（移動設備）
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Ripple 效果
    if (animationType === 'ripple') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      
      setRipples(prev => [...prev, { x, y, id }]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 600);
    }

    // 執行原始點擊事件
    onClick?.(e);
  };

  const buttonClasses = cn(
    'relative overflow-hidden font-medium rounded-lg transition-all duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
    variantClasses[variant],
    sizeClasses[size],
    {
      'transform active:scale-95': animationType === 'scale' && !disabled,
      'animate-pulse': animationType === 'pulse' && isLoading,
    },
    className
  );

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      {...props}
    >
      {/* 內容 */}
      <span className={cn(
        'relative z-10 flex items-center justify-center gap-2',
        isLoading && 'opacity-0'
      )}>
        {children}
      </span>

      {/* 載入狀態 */}
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText && (
            <span className="ml-2 text-sm">{loadingText}</span>
          )}
        </span>
      )}

      {/* Ripple 效果 */}
      {animationType === 'ripple' && ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '20px',
            height: '20px',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </button>
  );
};

// 動畫樣式（需要添加到 global CSS）
const animationStyles = `
@keyframes ripple {
  to {
    width: 400px;
    height: 400px;
    opacity: 0;
  }
}

.animate-ripple {
  animation: ripple 0.6s ease-out;
}
`;