import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

// 定義元件接收的 props 型別，繼承自標準的按鈕屬性
interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 是否顯示載入中的 spinner */
  isLoading?: boolean;
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
  className = '',
  ...props // 將其餘所有標準按鈕屬性（如 disabled, onClick 等）傳遞給 button 元素
}) => {
  return (
    <button
      // 將基礎樣式、外部傳入的 className 組合在一起
      className={`
        btn-primary flex justify-center items-center 
        transition-all duration-300 
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        ${className}
      `}
      // 當 isLoading 為 true 時，也禁用按鈕
      disabled={props.disabled || isLoading}
      {...props}
    >
      {/* 根據 isLoading 狀態，決定顯示 spinner 還是按鈕文字 */}
      {isLoading ? <LoadingSpinner /> : children}
    </button>
  );
};
