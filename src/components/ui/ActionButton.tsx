import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

// 定義元件接收的 props 型別，繼承自標準的按鈕屬性
interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 是否顯示載入中的 spinner */
  isLoading?: boolean;
  /** 是否顯示載入中的 spinner (別名，兼容性) */
  loading?: boolean;
  /** 按鈕是否佔滿容器寬度 */
  fullWidth?: boolean;
  /** 按鈕變體樣式 */
  variant?: 'primary' | 'danger' | 'secondary';
  /** 按鈕中顯示的內容 */
  children: ReactNode;
  /** 允許從外部傳入額外的 Tailwind CSS class */
  className?: string;
}

/**
 * ActionButton 是一個全站通用的主要操作按鈕。
 * 它封裝了載入中和禁用狀態的視覺邏輯。
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  isLoading = false,
  loading = false,
  fullWidth = false,
  variant = 'primary',
  className = '',
  ...props // 將其餘所有標準按鈕屬性（如 disabled, onClick 等）傳遞給 button 元素
}) => {
  // 合併 isLoading 和 loading 屬性
  const isButtonLoading = isLoading || loading;
  
  // 根據 variant 選擇基礎樣式
  const getVariantClassName = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white';
      case 'primary':
      default:
        return 'btn-primary';
    }
  };

  // 移除 loading, fullWidth, variant 屬性，避免傳遞到 DOM
  const { loading: _loading, fullWidth: _fullWidth, variant: _variant, ...buttonProps } = props;

  return (
    <button
      // 將基礎樣式、外部傳入的 className 組合在一起
      className={`
        ${getVariantClassName()} flex justify-center items-center 
        transition-all duration-300 
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      // 當 isButtonLoading 為 true 時，也禁用按鈕
      disabled={buttonProps.disabled || isButtonLoading}
      {...buttonProps}
    >
      {/* 根據 isButtonLoading 狀態，決定顯示 spinner 還是按鈕文字 */}
      {isButtonLoading ? <LoadingSpinner /> : children}
    </button>
  );
};
