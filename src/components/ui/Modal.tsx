// src/components/ui/Modal.tsx

import React, { useEffect, type ReactNode } from 'react';
import { ActionButton } from './ActionButton';
import { Z_INDEX } from '../../config/zIndex';

// 定義 Modal 元件接收的 props 型別
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  isConfirming?: boolean;
  confirmVariant?: 'primary' | 'danger';
  showCloseButton?: boolean;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
  zIndex?: number;
  isTutorial?: boolean;
}

/**
 * Modal 是一個通用的對話方塊元件，用於需要用戶確認的重要操作。
 * 它包含一個半透明的背景遮罩，並支援鍵盤 Esc 鍵關閉。
 * ★ 新增：預設加入了 animate-zoom-in 動畫。
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = '確認',
  isConfirming = false,
  confirmVariant = 'primary',
  showCloseButton = true,
  className = '',
  maxWidth = 'md',
  zIndex,
  isTutorial = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const confirmButtonClass = confirmVariant === 'danger' 
    ? 'bg-red-600 hover:bg-red-700' 
    : 'btn-primary';

  const maxWidthClass = {
    'sm': 'max-w-sm',
    'md': 'max-w-md', 
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl'
  }[maxWidth];

  return (
    // 背景遮罩層
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center backdrop-blur-sm px-4 py-4 overflow-y-auto"
      style={{ zIndex }}
      onClick={onClose}
    >
      {/* Modal 內容卡片，加入了 animate-zoom-in */}
      <div
        className={`card-bg p-6 rounded-2xl shadow-2xl w-full ${maxWidthClass} my-auto animate-zoom-in ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <h3 id="modal-title" className="text-2xl font-bold text-gray-100 font-serif mb-4">{title}</h3>
        )}
        <div className="text-gray-300 mb-6">{children}</div>
        {onConfirm && (
          <div className="flex justify-end gap-3">
            {showCloseButton && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition"
              >
                取消
              </button>
            )}
            <ActionButton
              onClick={onConfirm}
              isLoading={isConfirming}
              className={`w-28 h-10 ${confirmButtonClass}`}
            >
              {confirmText}
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
};
